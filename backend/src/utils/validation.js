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
