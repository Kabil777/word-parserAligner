import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
    name: z.string().min(2, { message: 'Name is required' })
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' })
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid user ID' })
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    bio: z.string().optional()
  })
});
