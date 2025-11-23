export interface BillingAudit {
  id: string;
  userId: string;
  action: BillingAction;
  amount: number | null;
  currency: string | null;
  externalEventId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export enum BillingAction {
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  CHECKOUT_STARTED = 'CHECKOUT_STARTED',
  CHECKOUT_COMPLETED = 'CHECKOUT_COMPLETED',
  CHECKOUT_ABANDONED = 'CHECKOUT_ABANDONED',
  PORTAL_ACCESSED = 'PORTAL_ACCESSED',
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  highlighted: boolean;
  appleProductId?: string;
  googleProductId?: string;
}
