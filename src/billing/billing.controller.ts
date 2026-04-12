import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  assignSubscriptionSchema,
  createPlanSchema,
  getSubscriptionByTenantPayloadSchema,
  paginationSchema,
  type Pagination,
  updatePlanPayloadSchema,
  uuidIdPayloadSchema,
} from '@workspace/shared';

import { parsePayload } from '../common/zod/parse-payload';
import { BillingService } from './billing.service';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @MessagePattern({ cmd: 'create_plan' })
  createPlan(@Payload() payload: unknown) {
    const dto = parsePayload(createPlanSchema, payload);
    return this.billingService.createPlan(dto);
  }

  @MessagePattern({ cmd: 'find_all_plans' })
  findAllPlans(@Payload() payload: unknown) {
    const pagination = parsePayload(paginationSchema, payload) as Pagination;
    return this.billingService.findAllPlans(pagination);
  }

  @MessagePattern({ cmd: 'find_one_plan' })
  findOnePlan(@Payload() payload: unknown) {
    const { id } = parsePayload(uuidIdPayloadSchema, payload);
    return this.billingService.findOnePlan(id);
  }

  @MessagePattern({ cmd: 'update_plan' })
  updatePlan(@Payload() payload: unknown) {
    const dto = parsePayload(updatePlanPayloadSchema, payload);
    return this.billingService.updatePlan(dto);
  }

  @MessagePattern({ cmd: 'delete_plan' })
  deletePlan(@Payload() payload: unknown) {
    const { id } = parsePayload(uuidIdPayloadSchema, payload);
    return this.billingService.deletePlan(id);
  }

  @MessagePattern({ cmd: 'assign_subscription' })
  assignSubscription(@Payload() payload: unknown) {
    const dto = parsePayload(assignSubscriptionSchema, payload);
    return this.billingService.assignSubscription(dto);
  }

  @MessagePattern({ cmd: 'get_subscription_by_tenant' })
  getSubscriptionByTenant(@Payload() payload: unknown) {
    const { tenantId } = parsePayload(
      getSubscriptionByTenantPayloadSchema,
      payload,
    );
    return this.billingService.getSubscriptionByTenant(tenantId);
  }

  @MessagePattern({ cmd: 'list_subscriptions' })
  listSubscriptions(@Payload() payload: unknown) {
    const pagination = parsePayload(paginationSchema, payload) as Pagination;
    return this.billingService.listSubscriptions(pagination);
  }
}
