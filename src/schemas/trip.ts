import { z } from 'zod'

export const tripFormSchema = z.object({
  location: z.string().min(1, 'Location is required').max(100, 'Location too long'),
  date: z.string().min(1, 'Date is required').refine(
    (date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    },
    'Date must be today or in the future'
  ),
  targetSpecies: z.array(z.string()).min(1, 'Select at least one target species').max(5, 'Maximum 5 species'),
  duration: z.enum(['half-day', 'full-day', 'multi-day']).default('full-day'),
  experience: z.enum(['beginner', 'intermediate', 'expert']).default('intermediate')
})

export type TripFormData = z.infer<typeof tripFormSchema>

export const commonSpecies = [
  'Bass (Largemouth)',
  'Bass (Smallmouth)',
  'Bass (Striped)',
  'Trout (Rainbow)',
  'Trout (Brown)',
  'Trout (Brook)',
  'Salmon (Chinook)',
  'Salmon (Coho)',
  'Walleye',
  'Pike (Northern)',
  'Muskie',
  'Catfish',
  'Crappie',
  'Bluegill',
  'Perch',
  'Redfish',
  'Snook',
  'Tarpon',
  'Mahi Mahi',
  'Tuna'
] as const 