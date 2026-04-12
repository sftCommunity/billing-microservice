import type { CreatePlan } from '@workspace/shared';

/** Idempotent upsert keys (`code`); aligned with `planLimitsSchema`. */
export const DEMO_BILLING_PLANS: readonly CreatePlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Small teams getting started',
    limits: { maxUsers: 5, maxLocations: 1, posEnabled: true },
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Growing businesses',
    limits: { maxUsers: 25, maxLocations: 3, posEnabled: true },
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Large deployments',
    limits: { maxUsers: 999, maxLocations: 99, posEnabled: true },
  },
];

/** Plan code used when `tenantId` is passed to `seed_billing_demo`. */
export const DEMO_DEFAULT_SUBSCRIPTION_PLAN_CODE = 'starter' as const;
