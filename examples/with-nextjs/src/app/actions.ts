'use server';

import { z } from 'zod';
import { action } from '../lib/api';

export const signInAction = action
  .post()
  .state<{ message: string }>()
  .validator(
    z.object({
      email: z.string({ required_error: 'Email is required' }).email(),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters'),
    }),
  )
  .action(async ({ req }) => {
    const { parsedInput } = req;

    if (
      parsedInput.email !== 'admin@example.com' ||
      parsedInput.password !== 'password'
    ) {
      return {
        code: 400,
        message: 'Invalid email or password',
      };
    }

    return {
      code: 0,
      message: 'Sign in successfully',
    };
  });
