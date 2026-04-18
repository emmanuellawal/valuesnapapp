import { z } from 'zod';

export const LISTING_TITLE_MAX_LENGTH = 80;

export const LISTING_CONDITION_VALUES = [
  'new',
  'like_new',
  'very_good',
  'good',
  'acceptable',
] as const;

export type ListingCondition = (typeof LISTING_CONDITION_VALUES)[number];

export const listingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(LISTING_TITLE_MAX_LENGTH, 'Title must be 80 characters or less'),
  category: z.string().trim().min(1, 'Category is required'),
  condition: z.enum(LISTING_CONDITION_VALUES, {
    error: 'Condition is required',
  }),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: 'Price must be a positive number',
    }),
  description: z.string().optional().default(''),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export interface ListingDraft {
  valuationId: string;
  formValues: ListingFormValues;
}