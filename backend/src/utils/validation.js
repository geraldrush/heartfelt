import { z } from 'zod';
import { getReferenceData } from './db.js';

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
    .min(18, { message: 'You must be at least 18 years old.' })
    .optional(),
  gender: z
    .enum(['male', 'female', 'non-binary', 'other'], {
      message: 'Gender is required.',
    })
    .optional(),
  nationality: z.string().min(1, { message: 'Nationality is required.' }).optional(),
  location_city: z.string().min(1, { message: 'City is required.' }).optional(),
  location_province: z.string().min(1, { message: 'Province is required.' }).optional(),
});

export const emailLoginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, { message: 'Google credential is required.' }),
});

export const updatePreferencesSchema = z.object({
  seeking_gender: z.enum(['male', 'female', 'non-binary', 'other', 'any']).optional(),
  seeking_age_min: z.number().int().min(18).max(100).optional(),
  seeking_age_max: z.number().int().min(18).max(100).optional(),
  seeking_races: z.array(z.string()).max(10).optional(), // Array of race names
}).refine(
  (data) => {
    if (data.seeking_age_min && data.seeking_age_max) {
      return data.seeking_age_min <= data.seeking_age_max;
    }
    return true;
  },
  { message: 'Minimum age must be less than or equal to maximum age.' }
);

export const onboardingBasicsSchema = z.object({
  age: z.number().int().min(18),
  gender: z.enum(['male', 'female', 'non-binary', 'other']),
  seeking_gender: z.enum(['male', 'female', 'non-binary', 'other', 'any']),
});

export const updateProfilePartialSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  age: z.number().int().min(18).optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'other']).optional(),
  nationality: z.string().min(1).optional(),
  religion: z.string().min(1).optional(),
  race: z.string().min(1).optional(),
  has_kids: z.boolean().optional(),
  num_kids: z
    .number()
    .int()
    .refine((value) => [0, 1, 2, 3].includes(value), {
      message: 'Number of kids must be 0, 1, 2, or 3+.',
    })
    .optional(),
  smoker: z.boolean().optional(),
  drinks_alcohol: z.boolean().optional(),
  location_city: z.string().min(1).optional(),
  location_province: z.string().min(1).optional(),
  seeking_gender: z.enum(['male', 'female', 'non-binary', 'other', 'any']).optional(),
  seeking_age_min: z.number().int().min(18).max(100).optional(),
  seeking_age_max: z.number().int().min(18).max(100).optional(),
  seeking_races: z.array(z.string()).max(10).optional(),
}).refine(
  (data) => {
    if (data.seeking_age_min && data.seeking_age_max) {
      return data.seeking_age_min <= data.seeking_age_max;
    }
    return true;
  },
  { message: 'Minimum age must be less than or equal to maximum age.' }
);

export const updateProfileSchema = z.object({
  age: z.number().int().min(18),
  gender: z.enum(['male', 'female', 'non-binary', 'other']),
  nationality: z.string().min(1),
  religion: z.string().min(1),
  race: z.string().min(1),
  has_kids: z.boolean(),
  num_kids: z.number().int().refine((value) => [0, 1, 2, 3].includes(value), {
    message: 'Number of kids must be 0, 1, 2, or 3+.',
  }),
  smoker: z.boolean(),
  drinks_alcohol: z.boolean(),
  location_city: z.string().min(1),
  location_province: z.string().min(1),
  seeking_gender: z.enum(['male', 'female', 'non-binary', 'other', 'any']).optional(),
  seeking_age_min: z.number().int().min(18).max(100).optional(),
  seeking_age_max: z.number().int().min(18).max(100).optional(),
  seeking_races: z.array(z.string()).max(10).optional(),
}).refine(
  (data) => {
    if (data.seeking_age_min && data.seeking_age_max) {
      return data.seeking_age_min <= data.seeking_age_max;
    }
    return true;
  },
  { message: 'Minimum age must be less than or equal to maximum age.' }
);

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
  limit: z.coerce.number().int().min(1).max(50).default(20), // Reduced max from 100 to 50
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
  request_id: z.string().min(1, { message: 'Request ID is required.' }),
});

export const paymentInitiateSchema = z.object({
  package_id: z.string().uuid(),
});

export async function validateReferenceData(db, religion, race) {
  const referenceData = await getReferenceData(db);
  const errors = {};
  let valid = true;

  // Validate religion
  const validReligions = referenceData.religions.map(r => r.name);
  if (!validReligions.includes(religion)) {
    errors.religion = `Invalid religion value. Allowed values are: ${validReligions.join(', ')}`;
    valid = false;
  }

  // Validate race
  const validRaces = referenceData.races.map(r => r.name);
  if (!validRaces.includes(race)) {
    errors.race = `Invalid race value. Allowed values are: ${validRaces.join(', ')}`;
    valid = false;
  }

  return { valid, errors };
}
