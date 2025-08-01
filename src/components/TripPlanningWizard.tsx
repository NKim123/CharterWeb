/* NEW -- multi-step wizard replacing TripPlanningForm */
import React, { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripFormSchema, type TripFormData, commonSpecies } from '../schemas/trip';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;
interface Props {
    onSubmit: (data: TripFormData) => Promise<void>;
    isLoading?: boolean;
}
/* 0 = location, 1 = details, 2 = species */
export default function TripPlanningWizard({ onSubmit, isLoading = false }: Props) {
    const [step, setStep] = useState<0 | 1 | 2>(0);
    /* ───────── shared form state ───────── */
    const methods = useForm<TripFormData>({
        resolver: zodResolver(tripFormSchema),
        mode: 'onTouched',
        defaultValues: {
            targetSpecies: [],
            duration: 'custom',
            startTime: '06:00',
            endTime: '14:00',
            experience: 'intermediate',
            styles: ['spin'],
            platform: 'shore'
        }
    });
    const { register, setValue, watch, trigger, formState: { errors } } = methods;
    /* ───────── step-0 map & summary ───────── */
    const mapDiv = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [locationLabel, setLocationLabel] = useState('');
    useEffect(() => {
        /* set up MapBox only while on step 0 */
        if (step !== 0 || !mapDiv.current || mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
            container: mapDiv.current,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [-98.5795, 39.8283],
            zoom: 3
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl());

        const click = async (e: any) => {
                const { lng, lat } = e.lngLat;
                /* cmd/ctrl click → ask for summary */
                if ((e.originalEvent as MouseEvent).metaKey || (e.originalEvent as MouseEvent).ctrlKey) {
                    if (!window.confirm('Summarize fishing at this spot?')) return;
                    try {
                        const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/summarize_pin`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string
                            },
                            body: JSON.stringify({ lon: lng, lat })
                        });
                        const { summary } = await res.json();
                        if (summary) {
                            new mapboxgl.Popup().setLngLat([lng, lat]).setHTML(`<p>${summary}</p>`).addTo(mapRef.current!);
                        }
                    } catch (err) { console.error(err); }
                    return;
                }
                /* normal click → choose location */
                markerRef.current?.remove();
                markerRef.current = new mapboxgl.Marker({ color: '#f43f5e' }).setLngLat([lng, lat]).addTo(mapRef.current!);
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                    const { display_name } = await resp.json();
                    const label = display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    setLocationLabel(label);
                    setValue('location', label, { shouldValidate: true });
                } catch {
                    const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    setLocationLabel(label);
                    setValue('location', label, { shouldValidate: true });
                }
        };
        mapRef.current.on('click', click);

        return () => {
            mapRef.current?.off('click', click);
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [step]);
    /* ───────── navigation helpers ───────── */
    const validateStep = async () => {
        if (step === 0) return trigger(['location']);
        if (step === 1) return trigger(['date', 'startTime', 'endTime', 'styles', 'platform', 'experience']);
        return true;
    };
    // scroll to top when step changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const next = async () => (await validateStep()) && setStep((s) => (s + 1) as any);
    const back = () => setStep((s) => (s - 1) as any);
    /* ───────── species selection logic ───────── */
    const watchedSpecies = watch('targetSpecies');
    const [selectedSpecies, setSelectedSpecies] = useState<string[]>(watchedSpecies);
    useEffect(() => setSelectedSpecies(watchedSpecies), [watchedSpecies]);
    const toggle = (sp: string) => {
        const updated = selectedSpecies.includes(sp)
            ? selectedSpecies.filter((s) => s !== sp)
            : [...selectedSpecies, sp];
        setSelectedSpecies(updated);
        setValue('targetSpecies', updated, { shouldValidate: true });
    };
    /* ───────── UI ───────── */
    // Compute whether Next button should be disabled
    const locationVal = watch('location');
    const dateVal = watch('date');
    const startVal = watch('startTime');
    const endVal = watch('endTime');
    const stylesVal = watch('styles');
    const isNextDisabled = (() => {
        if (isLoading) return true;
        if (step === 0) return !locationVal;
        if (step === 1) return !dateVal || !startVal || !endVal || !(stylesVal?.length);
        return false;
    })();
    return (
        <FormProvider {...methods}>
            <div className="mx-auto p-6 bg-white rounded-lg shadow-lg max-w-full md:max-w-3xl lg:max-w-4xl">
                {/* ── step indicator ── */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === i ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'}`}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
                {step === 0 && (
                    <section>
                        <h2 className="text-3xl font-bold text-brand mb-4 text-center">Where do you want to fish?</h2>
                        <p className="text-gray-600 text-sm mb-4 max-w-lg mx-auto">Tap anywhere on the map to drop a red pin and select your fishing spot. For now, CharterAI supports locations within the United States. Hold Cmd/Ctrl and click to see a quick AI-generated fishing summary for that point.</p>
                        <div
                            ref={mapDiv}
                            style={{ width: '100%', height: '24rem' }}
                            className="rounded-lg overflow-hidden shadow mb-4"
                        />
                        {locationLabel && <p className="text-sm mb-2">Selected: {locationLabel}</p>}
                        {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
                    </section>
                )}
                {step === 1 && (
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-brand mb-2">Trip Details</h2>
                        {/* date */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Date </label>
                            <input type="date" {...register('date')} min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                            {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
                        </div>
                        {/* time */}
                        <div className="grid grid-cols-2 gap-4">
                            {['startTime', 'endTime'].map((field, i) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium mb-2">{i === 0 ? 'Start' : 'End'} </label>
                                    <input type="time" {...register(field as 'startTime' | 'endTime')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                                    {(errors as any)[field] && <p className="text-sm text-red-600">{(errors as any)[field].message}</p>}
                                </div>
                            ))}
                        </div>
                        {/* styles */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Preferred Style(s) </label>
                            <div className="flex gap-4 flex-wrap">
                                {['fly', 'spin', 'cast'].map(s => (
                                    <label key={s} className="flex items-center space-x-2">
                                        <input type="checkbox" value={s} {...register('styles')}
                                            className="rounded border-gray-300 text-accent" />
                                        <span className="capitalize text-sm">{s}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.styles && <p className="text-sm text-red-600">{errors.styles.message}</p>}
                        </div>
                        {/* platform */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Fishing From</label>
                            <select {...register('platform')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                                <option value="shore">Shore / Wading</option>
                                <option value="boat">Boat / Kayak</option>
                            </select>
                        </div>
                        {/* experience */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Experience Level</label>
                            <select {...register('experience')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="expert">Expert</option>
                            </select>
                        </div>
                    </section>
                )}
                {step === 2 && (
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-brand mb-2">Target Species (1-5)</h2>
                        {/* TODO: dynamic filtering based on location */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-4">
                            {commonSpecies.map(sp => (
                                <label key={sp} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={selectedSpecies.includes(sp)} onChange={() => toggle(sp)}
                                        className="rounded border-gray-300 text-accent" />
                                    <span className="text-sm">{sp}</span>
                                </label>
                            ))}
                        </div>
                        {errors.targetSpecies && <p className="text-sm text-red-600">{errors.targetSpecies.message}</p>}
                    </section>
                )}
                {/* navigation */}
                <div className="mt-8 flex justify-between">
                    {step > 0 ? (
                        <button type="button" onClick={back}
                            className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">Back</button>
                    ) : <span />}
                    {step < 2 ? (
                        <button type="button" onClick={next} disabled={isNextDisabled}
                            className="px-6 py-3 bg-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                    ) : (
                        <button type="button" disabled={isLoading} onClick={methods.handleSubmit(onSubmit)}
                            className="px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-lg disabled:opacity-50 flex items-center">
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 1012 12h-4l3 3 3-3h-4A12 12 0 014 12z" /></svg>
                                    Generating…
                                </>
                            ) : 'Generate Plan'}
                        </button>
                    )}
                </div>
            </div>
        </FormProvider >
    );
}