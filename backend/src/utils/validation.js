import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const emailSignupSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(passwordRegex, {
      message: 'Password must include at least one uppercase letter and one number.',
    }),
  full_name: z.string().min(2, { message: 'Full name is required.' }),
  age: z.coerce
    .number()
    .int({ message: 'Age must be a whole number.' })
    .min(18, { message: 'You must be at least 18 years old.' }),
  gender: z.enum(['male', 'female', 'non-binary', 'other'], {
    message: 'Gender is required.',
  }),
  nationality: z.string().min(1, { message: 'Nationality is required.' }),
  location_city: z.string().min(1, { message: 'City is required.' }),
  location_province: z.string().min(1, { message: 'Province is required.' }),
});

export const emailLoginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, { message: 'Google credential is required.' }),
});

export const updateProfileSchema = z.object({
  age: z.number().int().min(18),
  gender: z.enum(['male', 'female', 'non-binary', 'other']),
  nationality: z.string().min(1),
  religion: z.string().min(1),
  race: z.string().min(1),
  education: z.string().min(1),
  has_kids: z.boolean(),
  num_kids: z.number().int().refine((value) => [0, 1, 2, 3].includes(value), {
    message: 'Number of kids must be 0, 1, 2, or 3+.',
  }),
  smoker: z.boolean(),
  drinks_alcohol: z.boolean(),
  location_city: z.string().min(1),
  location_province: z.string().min(1),
});

export const createStorySchema = z.object({
  story_text: z.string().min(50, { message: 'Story must be at least 50 characters.' }),
  image_ids: z.array(z.string()).min(1).max(5),
});

export const tokenTransferSchema = z.object({
  recipient_id: z.string().uuid(),
  amount: z.number().int().min(1).max(1000),
  message: z.string().max(200).optional(),
});

export const tokenHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const tokenRequestSchema = z.object({
  recipient_id: z.string().uuid(),
  amount: z.number().int().min(1).max(1000),
  reason: z.string().max(200).optional(),
});

export const connectionRequestSchema = z.object({
  receiver_id: z.string().uuid(),
  message: z.string().max(200).optional(),
});

export const connectionActionSchema = z.object({
  request_id: z.string().uuid(),
});

export const paymentInitiateSchema = z.object({
  package_id: z.string().uuid(),
});
