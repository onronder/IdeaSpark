import { z } from 'zod';

// Validate receipt schema
export const validateReceiptSchema = z.object({
  body: z.object({
    platform: z.enum(['ios', 'android'], {
      errorMap: () => ({ message: 'Platform must be ios or android' }),
    }),
    productId: z.string().min(1, 'Product ID is required'),
    receipt: z.string().min(1, 'Receipt is required'),
    transactionId: z.string().min(1, 'Transaction ID is required'),
  }),
});

// Restore purchases schema
export const restorePurchasesSchema = z.object({
  body: z.object({
    receipts: z.array(z.object({
      platform: z.enum(['ios', 'android'], {
        errorMap: () => ({ message: 'Platform must be ios or android' }),
      }),
      productId: z.string().min(1, 'Product ID is required'),
      receipt: z.string().min(1, 'Receipt is required'),
      transactionId: z.string().min(1, 'Transaction ID is required'),
    })).min(1, 'Receipts must be an array with at least one item'),
  }),
});
