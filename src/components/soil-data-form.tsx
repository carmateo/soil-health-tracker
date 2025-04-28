
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, MapPin, Calendar as CalendarIcon, Globe, Lock } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { SoilData } from '@/types/soil';
import Image from 'next/image';
import { LoadingSpinner } from './loading-spinner';

// Schemas
const baseSchema = z.object({
  date: z.date().default(new Date()),
  locationOption: z.enum(['gps', 'manual']).default('gps'),
  manualLocation: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  privacy: z.enum(['public', 'private']),
});

const vessSchema = z.object({
  measurementType: z.literal('vess'),
  vessScore: z.number().min(1).max(5),
});

const compositionSchema = z.object({
  measurementType: z.literal('composition'),
  sand: z.number().min(0, "Cannot be negative").optional(),
  clay: z.number().min(0, "Cannot be negative").optional(),
  silt: z.number().min(0, "Cannot be negative").optional(),
}).refine(data => (data.sand ?? 0) + (data.clay ?? 0) + (data.silt ?? 0) > 0, {
  message: "At least one measurement (Sand, Clay, or Silt) must be provided.",
  path: ['sand'], // Apply error to one field for simplicity
});


// Combine schemas based on measurementType using refine/superRefine if needed,
// but for the form structure, we'll handle conditional rendering.
// The actual data saved will depend on the selected measurementType.
const formSchema = z.union([
    baseSchema.merge(vessSchema),
    baseSchema.merge(compositionSchema)
]).refine(data => {
    if (data.locationOption === 'manual') {
      return typeof data.manualLocation === 'string' && data.manualLocation.trim().length > 0;
    }
    return true;
}, {
    message: "Manual location name is required when selected.",
    path: ['manualLocation'],
}).refine(data => {
    if (data.locationOption === 'gps') {
        return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
}, {
    message: "GPS coordinates could not be obtained. Please try again or enter manually.",
    path: ['locationOption'], // Or a general form error field
});


type SoilFormInputs = z.infer<typeof formSchema>;

const VESS_IMAGES: Record<number, string> = {
    1: 'https://picsum.photos/seed/vess1/200/200', // Replace with actual representative images
    2: 'https://picsum.photos/seed/vess2/200/200',
    3: 'https://picsum.photos/seed/vess3/200/200',
    4: 'https://picsum.photos/seed/vess4/200/200',
    5: 'https://picsum.photos/seed/vess5/200/200',
};

const VESS_DESCRIPTIONS: Record<number, string> = {
    1: 'Very Poor: Dense, large clods, difficult root penetration.',
    2: 'Poor: Large, angular blocks, limited root growth.',
    3: 'Moderate: Mix of blocky and granular, moderate root penetration.',
    4: 'Good: Mostly granular, good porosity, easy root growth.',
    5: 'Excellent: Very friable, granular structure, extensive rooting.',
};

interface SoilDataFormProps {
  initialData?: SoilData & { id: string }; // For editing
  onFormSubmit?: () => void;
}

export function SoilDataForm({ initialData, onFormSubmit }: SoilDataFormProps) {
  const { db } = useFirebase();
  const { user, settings } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [measurementType, setMeasurementType] = useState<'vess' | 'composition' | null>(initialData?.measurementType ?? null);
  const [selectedVessScore, setSelectedVessScore] = useState<number>(initialData?.vessScore ?? 3); // Default VESS score

  const form = useForm<SoilFormInputs>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date.toDate() ?? new Date(),
      locationOption: initialData?.latitude ? 'gps' : (initialData?.location ? 'manual' : 'gps'),
      manualLocation: initialData?.location ?? '',
      latitude: initialData?.latitude,
      longitude: initialData?.longitude,
      privacy: initialData?.privacy ?? settings?.defaultPrivacy ?? 'private',
      measurementType: initialData?.measurementType,
      vessScore: initialData?.vessScore ?? 3,
      sand: initialData?.sand,
      clay: initialData?.clay,
      silt: initialData?.silt,
    },
  });

  const watchMeasurementType = form.watch('measurementType');
  const watchLocationOption = form.watch('locationOption');
  const watchVessScore = form.watch('vessScore');
  const watchSand = form.watch('sand');
  const watchClay = form.watch('clay');
  const watchSilt = form.watch('silt');


   // Update visual VESS score when form value changes
   useEffect(() => {
    if (watchVessScore !== undefined) {
      setSelectedVessScore(watchVessScore);
    }
  }, [watchVessScore]);

  const handleGetGps = () => {
    setIsGpsLoading(true);
    setError(null); // Clear previous GPS errors
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          setIsGpsLoading(false);
          toast({title: "GPS Location Obtained", description: "Coordinates successfully fetched."})
        },
        (error) => {
          console.error("Geolocation error:", error);
          setError(`GPS Error: ${error.message}. Please ensure location services are enabled and permissions granted.`);
          form.setValue('locationOption', 'manual'); // Switch to manual if GPS fails
          setIsGpsLoading(false);
          toast({variant: "destructive", title: "GPS Error", description: "Could not obtain location. Switched to manual entry."})
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      form.setValue('locationOption', 'manual');
      setIsGpsLoading(false);
        toast({variant: "destructive", title: "GPS Not Supported", description: "Switched to manual entry."})
    }
  };

   // Get GPS automatically if option is selected and no coords exist
   useEffect(() => {
    if (watchLocationOption === 'gps' && form.getValues('latitude') === undefined && !isGpsLoading) {
        // Only fetch if explicitly GPS and no coordinates yet, and not already loading
        handleGetGps();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchLocationOption]); // Dependency only on the option itself


  const calculatePercentages = () => {
    const sandCm = form.getValues('sand') ?? 0;
    const clayCm = form.getValues('clay') ?? 0;
    const siltCm = form.getValues('silt') ?? 0;
    const total = sandCm + clayCm + siltCm;

    if (total === 0) {
        return { sandPercent: undefined, clayPercent: undefined, siltPercent: undefined };
    }

    return {
        sandPercent: Math.round((sandCm / total) * 100),
        clayPercent: Math.round((clayCm / total) * 100),
        siltPercent: Math.round((siltCm / total) * 100),
    };
  };


  const onSubmit = async (data: SoilFormInputs) => {
    if (!user) {
      setError("User not authenticated. Please log in.");
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to save data." });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Prepare data common to both types
      const baseData = {
        userId: user.uid,
        date: Timestamp.fromDate(data.date),
        privacy: data.privacy,
        ...(data.locationOption === 'manual' ? { location: data.manualLocation } : { latitude: data.latitude, longitude: data.longitude }),
      };

      let finalData: Omit<SoilData, 'id'>;

      if (data.measurementType === 'vess') {
        finalData = {
          ...baseData,
          measurementType: 'vess',
          vessScore: data.vessScore,
        };
      } else if (data.measurementType === 'composition') {
          const percentages = calculatePercentages();
          finalData = {
            ...baseData,
            measurementType: 'composition',
            sand: data.sand,
            clay: data.clay,
            silt: data.silt,
            sandPercent: percentages.sandPercent,
            clayPercent: percentages.clayPercent,
            siltPercent: percentages.siltPercent,
        };
      } else {
        throw new Error("Invalid measurement type selected"); // Should not happen with proper form logic
      }

      if (initialData?.id) {
         // Update existing document
         const docRef = doc(db, `users/${user.uid}/soilData`, initialData.id);
         await updateDoc(docRef, finalData);
         toast({ title: 'Data Updated', description: 'Soil sample data successfully updated.' });
      } else {
          // Add new document
          await addDoc(collection(db, `users/${user.uid}/soilData`), finalData);
          toast({ title: 'Data Saved', description: 'New soil sample data successfully saved.' });
          form.reset({ // Reset form after successful submission of NEW data
             date: new Date(),
             locationOption: 'gps',
             manualLocation: '',
             latitude: undefined,
             longitude: undefined,
             privacy: settings?.defaultPrivacy ?? 'private',
             measurementType: undefined, // Reset type selection
             vessScore: 3,
             sand: undefined,
             clay: undefined,
             silt: undefined,
          });
          setStep(1); // Reset steps
          setMeasurementType(null);
      }


      if (onFormSubmit) {
        onFormSubmit(); // Callback to potentially switch tabs or update UI
      }
    } catch (error: any) {
      console.error('Error saving data:', error);
      setError(error.message || 'Failed to save soil data. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
     const step1Fields: Array<keyof SoilFormInputs> = ['date', 'locationOption', 'manualLocation', 'latitude', 'longitude', 'privacy'];
     const result = await form.trigger(step1Fields);
     if (result) {
        if (!form.getValues('measurementType')) {
             form.setError('measurementType', { type: 'manual', message: 'Please select a measurement type.' });
             return;
        }
        setStep(2);
     } else {
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill in all required fields for Step 1." });
     }
  };
  const prevStep = () => setStep(1);

  const percentages = watchMeasurementType === 'composition' ? calculatePercentages() : null;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Date, Location, Privacy, Measurement Type */}
        <div className={step === 1 ? 'block' : 'hidden'}>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Step 1: General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Date (Readonly) */}
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>📅 Date</FormLabel>
                    <FormControl>
                        <Input value={field.value.toLocaleDateString()} readOnly disabled className="bg-muted/50" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

             {/* Location */}
            <FormField
                control={form.control}
                name="locationOption"
                render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>📍 Location</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            // Clear the other option's value
                            if (value === 'gps') {
                                form.setValue('manualLocation', '');
                                handleGetGps(); // Attempt to get GPS when switched
                            } else {
                                form.setValue('latitude', undefined);
                                form.setValue('longitude', undefined);
                            }
                        }}
                        value={field.value}
                        className="flex space-x-4"
                    >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="gps" />
                            </FormControl>
                            <FormLabel className="font-normal">Use GPS</FormLabel>
                             {isGpsLoading && <LoadingSpinner size={16}/>}
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="manual" />
                            </FormControl>
                            <FormLabel className="font-normal">Enter Manually</FormLabel>
                        </FormItem>
                    </RadioGroup>
                    </FormControl>
                    {/* Conditionally show Manual Input or GPS status */}
                    {field.value === 'manual' && (
                         <FormField
                            control={form.control}
                            name="manualLocation"
                            render={({ field: manualField }) => (
                                <FormItem>
                                <FormControl>
                                    <Input placeholder="Enter field name or address" {...manualField} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    )}
                     {field.value === 'gps' && form.getValues('latitude') !== undefined && (
                         <p className="text-sm text-muted-foreground">
                         GPS: {form.getValues('latitude')?.toFixed(4)}, {form.getValues('longitude')?.toFixed(4)}
                       </p>
                    )}
                     <FormMessage /> {/* For errors related to locationOption itself */}
                </FormItem>
                )}
            />

            {/* Privacy */}
            <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>👁️‍🗨️ Privacy</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select privacy setting" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="private">
                            <div className="flex items-center gap-2"> <Lock className="h-4 w-4" /> Private (Only You)</div>
                         </SelectItem>
                        <SelectItem value="public">
                           <div className="flex items-center gap-2"> <Globe className="h-4 w-4" /> Public (Visible to All)</div>
                        </SelectItem>
                    </SelectContent>
                    </Select>
                    <FormDescription>
                        Default is {settings?.defaultPrivacy ?? 'private'}. Can be changed per entry.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

              {/* Measurement Type Selection */}
             <FormField
                control={form.control}
                name="measurementType"
                render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                    <FormLabel>📊 Measurement Type</FormLabel>
                    <FormControl>
                        <RadioGroup
                         onValueChange={(value: 'vess' | 'composition') => {
                            field.onChange(value);
                            setMeasurementType(value); // Update local state for step transition logic
                            // Reset other type's values when switching
                            if (value === 'vess') {
                                form.setValue('sand', undefined);
                                form.setValue('clay', undefined);
                                form.setValue('silt', undefined);
                            } else {
                                form.setValue('vessScore', undefined);
                            }
                            }}
                        value={field.value}
                        className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                        >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="vess" />
                            </FormControl>
                            <FormLabel className="font-normal">
                             VESS Score (Visual Evaluation)
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="composition" />
                            </FormControl>
                            <FormLabel className="font-normal">
                             Soil Composition (Sand/Clay/Silt in cm)
                            </FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                     <FormMessage />
                    </FormItem>
                )}
            />
          </div>
          <div className="mt-6 flex justify-end">
             <Button type="button" onClick={nextStep} disabled={!watchMeasurementType}>
              Next Step &rarr;
            </Button>
          </div>
        </div>


        {/* Step 2: Measurement Details */}
        <div className={step === 2 ? 'block' : 'hidden'}>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                Step 2: {watchMeasurementType === 'vess' ? 'VESS Score Details' : 'Soil Composition Details'}
            </h2>

           {/* Conditional Fields based on measurementType */}
           {watchMeasurementType === 'vess' && (
             <FormField
                control={form.control}
                name="vessScore"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>VESS Score (1-5)</FormLabel>
                     <FormControl>
                         <>
                          <Slider
                              defaultValue={[field.value ?? 3]} // Use local state for visual sync
                              min={1}
                              max={5}
                              step={1}
                               onValueChange={(value) => {
                                  field.onChange(value[0]);
                                  setSelectedVessScore(value[0]); // Update visual state immediately
                              }}
                              className="my-4"
                              />
                             <div className="flex justify-between text-sm text-muted-foreground mt-2 px-1">
                                <span>1</span>
                                <span>2</span>
                                <span>3</span>
                                <span>4</span>
                                <span>5</span>
                             </div>
                            {/* Display Image and Description */}
                            <div className="mt-4 p-4 border rounded-md bg-muted/30 flex flex-col sm:flex-row items-center gap-4">
                                <Image
                                    src={VESS_IMAGES[selectedVessScore]}
                                    alt={`VESS Score ${selectedVessScore}`}
                                    width={150}
                                    height={150}
                                    className="rounded-md border vess-image-container"
                                    priority={false} // Smaller images, maybe not priority
                                />
                                <p className="text-center sm:text-left">{VESS_DESCRIPTIONS[selectedVessScore]}</p>
                            </div>
                        </>
                     </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
           )}

            {watchMeasurementType === 'composition' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="sand"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sand (cm)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="clay"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Clay (cm)</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="silt"
                         render={({ field }) => (
                        <FormItem>
                            <FormLabel>Silt (cm)</FormLabel>
                            <FormControl>
                             <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                        )}
                    />
                     {/* Display Calculated Percentages */}
                     {(watchSand || watchClay || watchSilt) && percentages && (
                        <div className="sm:col-span-3 mt-4 p-4 border rounded-md bg-muted/30">
                             <h4 className="font-medium mb-2 text-center">Calculated Composition (%)</h4>
                            <div className="flex justify-around text-center">
                                <div>
                                    <p className="text-lg font-semibold text-yellow-700">{percentages.sandPercent ?? '--'}%</p>
                                    <p className="text-sm text-muted-foreground">Sand</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-red-700">{percentages.clayPercent ?? '--'}%</p>
                                     <p className="text-sm text-muted-foreground">Clay</p>
                                </div>
                                 <div>
                                    <p className="text-lg font-semibold text-gray-600">{percentages.siltPercent ?? '--'}%</p>
                                     <p className="text-sm text-muted-foreground">Silt</p>
                                </div>
                            </div>
                        </div>
                     )}
                 </div>
            )}

            <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                 &larr; Previous Step
                 </Button>
                 <Button type="submit" disabled={loading}>
                     {loading ? (initialData ? 'Updating...' : 'Saving...') : (initialData ? 'Update Data' : 'Save Data')}
                 </Button>
            </div>
        </div>
      </form>
    </Form>
  );
}

    