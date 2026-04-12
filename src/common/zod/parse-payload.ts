import { RpcException } from '@nestjs/microservices';
import type { ZodSchema } from 'zod';

export function parsePayload<T>(schema: ZodSchema<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new RpcException({
      status: 400,
      message: parsed.error.flatten(),
    });
  }
  return parsed.data;
}
