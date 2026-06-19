
// TODO: npm install zod
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// Example schemas for key routes
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const checkoutSchema = z.object({
  planId: z.union([z.string(), z.number()]),
  playerId: z.union([z.string(), z.number()]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
