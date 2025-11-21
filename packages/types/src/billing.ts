export interface BillingAudit {
  id: string;
  userId: string;
  action: BillingAction;
  amount: number | null;
  currency: string | null;
  stripeEventId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metadata: Record<string, any>;
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

export interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date | null;
  paidAt: Date | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  createdAt: Date;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
  VOID = 'VOID',
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: PaymentMethodType;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  createdAt: Date;
}

export enum PaymentMethodType {
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  PAYPAL = 'PAYPAL',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
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
  stripePriceId: string;
}