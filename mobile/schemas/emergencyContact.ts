import { z } from 'zod';

export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  phone: z.string()
    .min(7, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9\s\-().]+$/, 'Enter a valid phone number'),
  country_code: z.string().default('+1'),
  relationship: z.enum(['spouse', 'parent', 'child', 'sibling', 'friend', 'doctor', 'other']),
  notify_on_critical: z.boolean().default(true),
});

export type EmergencyContactFormValues = z.infer<typeof emergencyContactSchema>;

export const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse:  'Spouse / Partner',
  parent:  'Parent',
  child:   'Child',
  sibling: 'Sibling',
  friend:  'Friend',
  doctor:  'Doctor / Nurse',
  other:   'Other',
};
