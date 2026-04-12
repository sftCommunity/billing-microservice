import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import type {
  AssignSubscription,
  CreatePlan,
  Pagination,
  SeedBillingDemoPayload,
  UpdatePlanPayload,
} from '@workspace/shared';

import {
  DEMO_BILLING_PLANS,
  DEMO_DEFAULT_SUBSCRIPTION_PLAN_CODE,
} from '../seed/demo-plans';

function serializePlan(plan: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  limits: unknown;
}) {
  return {
    ...plan,
    limits:
      plan.limits &&
      typeof plan.limits === 'object' &&
      !Array.isArray(plan.limits)
        ? (plan.limits as Record<string, unknown>)
        : {},
  };
}

function serializeSubscription(row: {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    limits: unknown;
  };
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    planId: row.planId,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    plan: serializePlan(row.plan),
  };
}

@Injectable()
export class BillingService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Upserts demo plans (`starter`, `growth`, `enterprise`) by `code`.
   * Optionally assigns **starter** to `tenantId` (UUID from auth `tenants` after auth seed).
   */
  async seedBillingDemo(input: SeedBillingDemoPayload) {
    const plansOut: ReturnType<typeof serializePlan>[] = [];
    for (const def of DEMO_BILLING_PLANS) {
      const row = await this.plan.upsert({
        where: { code: def.code },
        create: {
          code: def.code,
          name: def.name,
          description: def.description ?? null,
          limits: (def.limits ?? {}) as object,
        },
        update: {
          name: def.name,
          description: def.description ?? null,
          limits: (def.limits ?? {}) as object,
        },
      });
      plansOut.push(serializePlan(row));
    }

    let subscription: ReturnType<typeof serializeSubscription> | null = null;
    if (input.tenantId) {
      const starter = await this.plan.findUnique({
        where: { code: DEMO_DEFAULT_SUBSCRIPTION_PLAN_CODE },
      });
      if (!starter) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Seed failed: plan ${DEMO_DEFAULT_SUBSCRIPTION_PLAN_CODE} missing after upsert`,
        });
      }
      subscription = await this.assignSubscription({
        tenantId: input.tenantId,
        planId: starter.id,
        status: 'active',
      });
    }

    return { plans: plansOut, subscription };
  }

  async createPlan(dto: CreatePlan) {
    try {
      const row = await this.plan.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          limits: (dto.limits ?? {}) as object,
        },
      });
      return serializePlan(row);
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
      if (code === 'P2002') {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Plan code already exists',
        });
      }
      throw new RpcException(
        e instanceof Error ? e.message : JSON.stringify(e),
      );
    }
  }

  async findAllPlans(pagination: Pagination) {
    const { limit, page } = pagination;
    const total = await this.plan.count();
    const lastPage = Math.ceil(total / limit) || 1;
    const rows = await this.plan.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: rows.map((r) => serializePlan(r)),
      meta: { page, lastPage, total },
    };
  }

  async findOnePlan(id: string) {
    const row = await this.plan.findUnique({ where: { id } });
    if (!row) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Plan ${id} not found`,
      });
    }
    return serializePlan(row);
  }

  async updatePlan(dto: UpdatePlanPayload) {
    await this.findOnePlan(dto.id);
    const data = {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.limits !== undefined ? { limits: dto.limits as object } : {}),
    };
    if (Object.keys(data).length === 0) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'No fields to update',
      });
    }
    try {
      const row = await this.plan.update({
        where: { id: dto.id },
        data,
      });
      return serializePlan(row);
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
      if (code === 'P2002') {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'Plan code already exists',
        });
      }
      throw new RpcException(
        e instanceof Error ? e.message : JSON.stringify(e),
      );
    }
  }

  async deletePlan(id: string) {
    await this.findOnePlan(id);
    const count = await this.subscription.count({ where: { planId: id } });
    if (count > 0) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Cannot delete plan with active subscriptions',
      });
    }
    await this.plan.delete({ where: { id } });
    return { id, deleted: true };
  }

  async assignSubscription(dto: AssignSubscription) {
    const planRow = await this.plan.findUnique({ where: { id: dto.planId } });
    if (!planRow) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Plan ${dto.planId} not found`,
      });
    }

    const existing = await this.subscription.findFirst({
      where: { tenantId: dto.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const status = dto.status ?? 'active';
    const startsAt = dto.startsAt ?? new Date();
    const endsAt = dto.endsAt ?? null;

    if (existing) {
      const row = await this.subscription.update({
        where: { id: existing.id },
        data: {
          planId: dto.planId,
          status,
          startsAt,
          endsAt,
        },
        include: { plan: true },
      });
      return serializeSubscription(row);
    }

    const row = await this.subscription.create({
      data: {
        tenantId: dto.tenantId,
        planId: dto.planId,
        status,
        startsAt,
        endsAt,
      },
      include: { plan: true },
    });
    return serializeSubscription(row);
  }

  async getSubscriptionByTenant(tenantId: string) {
    const row = await this.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (!row) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `No subscription for tenant ${tenantId}`,
      });
    }
    return serializeSubscription(row);
  }

  async listSubscriptions(pagination: Pagination) {
    const { limit, page } = pagination;
    const total = await this.subscription.count();
    const lastPage = Math.ceil(total / limit) || 1;
    const rows = await this.subscription.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    return {
      data: rows.map((r) => serializeSubscription(r)),
      meta: { page, lastPage, total },
    };
  }
}
