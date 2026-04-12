import { BillingService } from './billing.service';

describe('BillingService', () => {
  it('constructs without throwing', () => {
    const svc = new BillingService();
    expect(svc).toBeDefined();
    void svc.$disconnect();
  });
});
