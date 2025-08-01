import { z } from 'zod'

export const tripFormSchema = z.object({
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  date: z.string().min(1, 'Date is required').refine(
    (date) => {
      const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
      return date >= todayStr
    },
    'Date must be today or in the future'
  ),
  targetSpecies: z.array(z.string()).min(1, 'Select at least one target species').max(5, 'Maximum 5 species'),
  duration: z.enum(['half-day', 'full-day', 'multi-day', 'custom']).default('custom'),
  startTime: z.string().min(1, 'Start time required').regex(/^\d{2}:\d{2}$/),
  endTime: z.string().min(1, 'End time required').regex(/^\d{2}:\d{2}$/),
  experience: z.enum(['beginner', 'intermediate', 'expert']).default('intermediate'),
  /* NEW FIELDS */
  styles: z.array(z.enum(['fly', 'spin', 'cast'])).min(1, 'Select at least one style'),
  platform: z.enum(['shore', 'boat']),
  // Only required when duration === 'multi-day', but optional otherwise
  numDays: z
    .number()
    .int()
    .min(2, 'Must be at least 2 days')
    .max(14, 'Max 14 days')
    .optional()
})
  // If duration is multi-day, numDays must be provided
  .refine((data) => (data.duration === 'multi-day' ? !!data.numDays : true), {
    message: 'Please enter number of days',
    path: ['numDays']
  })
  .refine((data) => {
    if (!data.startTime || !data.endTime) return false
    return data.endTime > data.startTime
  }, { message: 'End time must be after start time', path: ['endTime'] })

export type TripFormData = z.infer<typeof tripFormSchema>

export const commonSpecies = [
  // Expanded list (≥50) – alphabetised for UX
  'Bass (Largemouth)',
  'Bass (Smallmouth)',
  'Bass (Striped)',
  'Bluegill',
  'Bonefish',
  'Carp (Common)',
  'Catfish (Blue)',
  'Catfish (Channel)',
  'Catfish (Flathead)',
  'Crappie (Black)',
  'Crappie (White)',
  'Drum (Black)',
  'Flounder (Summer)',
  'Grouper (Gag)',
  'Halibut (Pacific)',
  'Mahi Mahi',
  'Marlin (Blue)',
  'Muskie',
  'Perch (Yellow)',
  'Pike (Northern)',
  'Redfish',
  'Sailfish',
  'Salmon (Chinook)',
  'Salmon (Coho)',
  'Sheepshead',
  'Snapper (Red)',
  'Snook',
  'Tarpon',
  'Trout (Brook)',
  'Trout (Brown)',
  'Trout (Lake)',
  'Trout (Rainbow)',
  'Tuna (Albacore)',
  'Tuna (Bluefin)',
  'Tuna (Yellowfin)',
  'Walleye',
  'Weakfish',
  'Yellowtail (Amberjack)'
] as const 