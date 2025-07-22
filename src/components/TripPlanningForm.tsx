import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripFormSchema, type TripFormData, commonSpecies } from '../schemas/trip'
import { LocationPicker } from './LocationPicker'

interface TripPlanningFormProps {
  onSubmit: (data: TripFormData) => Promise<void>
  isLoading?: boolean
}

export function TripPlanningForm({ onSubmit, isLoading = false }: TripPlanningFormProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      targetSpecies: [],
      duration: 'custom',
      startTime: '06:00',
      endTime: '14:00',
      experience: 'intermediate',
      styles: ['spin'],
      platform: 'shore'
    }
  })

  const handleSpeciesToggle = (species: string) => {
    const newSelection = selectedSpecies.includes(species)
      ? selectedSpecies.filter(s => s !== species)
      : [...selectedSpecies, species]
    
    setSelectedSpecies(newSelection)
    setValue('targetSpecies', newSelection)
  }

  const watchedSpecies = watch('targetSpecies')
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="mx-auto p-6 bg-white rounded-lg shadow-lg max-w-full md:max-w-2xl lg:max-w-3xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-brand mb-2">Plan Your Fishing Trip</h2>
        <p className="text-gray-600">Tell us about your ideal fishing adventure and we'll create a personalized itinerary.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Where do you want to fish? *
          </label>
          <div className="flex gap-2">
            <input
              {...register('location')}
              type="text"
              id="location"
              placeholder="Select on map or type manually"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              Pick on Map
            </button>
          </div>
          {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
        </div>

        {pickerOpen && (
          <LocationPicker
            onSelect={(loc) => setValue('location', loc)}
            onClose={() => setPickerOpen(false)}
          />
        )}

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            When are you planning to go? *
          </label>
          <input
            {...register('date')}
            type="date"
            id="date"
            min={new Date().toLocaleDateString('en-CA')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* Target Species */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What species are you targeting? * (Select 1-5)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
            {commonSpecies.map((species) => (
              <label key={species} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSpecies.includes(species)}
                  onChange={() => handleSpeciesToggle(species)}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-gray-700">{species}</span>
              </label>
            ))}
          </div>
          {errors.targetSpecies && (
            <p className="mt-1 text-sm text-red-600">{errors.targetSpecies.message}</p>
          )}
        </div>

        {/* Fishing Styles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Fishing Style(s) *
          </label>
          <div className="flex gap-4">
            {['fly', 'spin', 'cast'].map((style) => (
              <label key={style} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={style}
                  {...register('styles')}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                />
                <span className="capitalize text-sm">{style}</span>
              </label>
            ))}
          </div>
          {errors.styles && <p className="mt-1 text-sm text-red-600">{errors.styles.message}</p>}
        </div>

        {/* Platform */}
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
            Fishing From
          </label>
          <select
            {...register('platform')}
            id="platform"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="shore">Shore / Wading</option>
            <option value="boat">Boat / Kayak</option>
          </select>
        </div>

        {/* Number of Days – conditional */}
        {watch('duration') === 'multi-day' && (
          <div>
            <label htmlFor="numDays" className="block text-sm font-medium text-gray-700 mb-2">
              How many days?
            </label>
            <input
              type="number"
              min={2}
              max={14}
              step={1}
              {...register('numDays', { valueAsNumber: true })}
              id="numDays"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {errors.numDays && <p className="mt-1 text-sm text-red-600">{errors.numDays.message}</p>}
          </div>
        )}

        {/* Time Window */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="time"
              {...register('startTime')}
              id="startTime"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>}
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <input
              type="time"
              {...register('endTime')}
              id="endTime"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
          </div>
        </div>
        {/* Duration hidden field to satisfy backend */}
        <input type="hidden" value="custom" {...register('duration')} />

        {/* Experience Level */}
        <div>
          <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
            Experience Level
          </label>
          <select
            {...register('experience')}
            id="experience"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Generating Your Trip Plan...
            </div>
          ) : (
            'Generate Trip Plan'
          )}
        </button>
      </form>
    </div>
  )
} 