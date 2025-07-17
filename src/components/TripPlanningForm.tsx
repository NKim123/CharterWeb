import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripFormSchema, type TripFormData, commonSpecies } from '../schemas/trip'

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
      duration: 'full-day',
      experience: 'intermediate'
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
          <input
            {...register('location')}
            type="text"
            id="location"
            placeholder="e.g., Lake Michigan, Florida Keys, Columbia River"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            When are you planning to go? *
          </label>
          <input
            {...register('date')}
            type="date"
            id="date"
            min={new Date().toISOString().split('T')[0]}
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

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            Trip Duration
          </label>
          <select
            {...register('duration')}
            id="duration"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="half-day">Half Day (4-6 hours)</option>
            <option value="full-day">Full Day (8-10 hours)</option>
            <option value="multi-day">Multi Day (2+ days)</option>
          </select>
        </div>

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