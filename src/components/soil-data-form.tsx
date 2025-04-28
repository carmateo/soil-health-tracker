
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, SubmitHandler, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { collection, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, MapPin, LocateFixed, Globe, Lock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { SoilData, UserSettings as UserSettingsType } from '@/types/soil';
import Image from 'next/image';


// Base schema parts
const baseSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(), // Allow null
  longitude: z.number().optional().nullable(), // Allow null
  privacy: z.enum(['public', 'private']),
});

// VESS measurement specific schema - extending base
const vessFormSchema = baseSchema.extend({
  measurementType: z.literal('vess'),
  vessScore: z.number().min(1).max(5),
  // Ensure other measurement fields are explicitly optional/nullable for this type
  sand: z.number().optional().nullable(),
  clay: z.number().optional().nullable(),
  silt: z.number().optional().nullable(),
});

// Composition measurement specific schema - extending base
const compositionFormSchema = baseSchema.extend({
  measurementType: z.literal('composition'),
  sand: z.number({ required_error: "Sand (cm) is required." }).min(0).nullable(), // Allow null initially maybe? No, required means non-null/non-undefined
  clay: z.number({ required_error: "Clay (cm) is required." }).min(0).nullable(),
  silt: z.number({ required_error: "Silt (cm) is required." }).min(0).nullable(),
  // Ensure VESS score is explicitly optional/nullable for this type
  vessScore: z.number().optional().nullable(),
}).refine(data => (data.sand ?? 0) + (data.clay ?? 0) + (data.silt ?? 0) > 0, {
    message: "Total composition (sand + clay + silt) must be greater than 0 cm.",
    path: ["sand"], // Assign error to one field or create a custom path if needed
});

// Combine schemas using discriminated union, dentro de una función
const getFormSchema = () => z.discriminatedUnion('measurementType', [
  vessFormSchema,
  compositionFormSchema,
]);



type SoilFormInputs = z.infer<ReturnType<typeof getFormSchema>>;

const VESS_IMAGES = [
  { score: 1, url: 'https://picsum.photos/seed/vess1/200', description: 'Sq1: Very poor structure, compact, no aggregation.' },
  { score: 2, url: 'https://picsum.photos/seed/vess2/200', description: 'Sq2: Poor structure, mainly large clods, few aggregates.' },
  { score: 3, url: 'https://picsum.photos/seed/vess3/200', description: 'Sq3: Moderate structure, mix of clods and aggregates.' },
  { score: 4, url: 'https://picsum.photos/seed/vess4/200', description: 'Sq4: Good structure, mainly aggregates, few clods.' },
  { score: 5, url: 'https://picsum.photos/seed/vess5/200', description: 'Sq5: Excellent structure, porous, fully aggregated.' },
];

interface SoilDataFormProps {
  initialData?: SoilData & { id: string }; // For editing existing data
  onFormSubmit?: () => void; // Callback after successful submission/update
}


export function SoilDataForm({ initialData, onFormSubmit }: SoilDataFormProps) {
  const { db } = useFirebase();
  const { user, settings } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Function to generate default values based on measurement type
  const getDefaultValues = (data?: SoilData & { id: string }, userSettings?: UserSettingsType | null): SoilFormInputs => {
    const baseDefaults = {
        date: new Date(),
        privacy: userSettings?.defaultPrivacy || 'private',
        location: '',
        latitude: undefined,
        longitude: undefined,
    };

    if (data) {
      const commonData = {
        ...baseDefaults,
        date: data.date.toDate(),
        location: data.location ?? '',
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        privacy: data.privacy,
      };
      if (data.measurementType === 'vess') {
        return {
          ...commonData,
          measurementType: 'vess',
          vessScore: data.vessScore ?? 3, // Provide default if null/undefined
          sand: null,
          clay: null,
          silt: null,
        };
      } else if (data.measurementType === 'composition') {
        return {
          ...commonData,
          measurementType: 'composition',
          sand: data.sand ?? null, // Use null as default for nullable numbers
          clay: data.clay ?? null,
          silt: data.silt ?? null,
          vessScore: null,
        };
      }
    }

    // Default for new form (starts as 'vess')
    return {
        ...baseDefaults,
        measurementType: 'vess', // Ensure discriminator is set
        vessScore: 3,
        sand: null,
        clay: null,
        silt: null,
      };
  };

  const form = useForm<SoilFormInputs>({
    resolver: zodResolver(getFormSchema()),
    defaultValues: getDefaultValues(initialData, settings), // Let getDefaultValues handle all defaults
    mode: 'onChange',
  });

   // Watch relevant fields
  const watchedMeasurementType = useWatch({ control: form.control, name: "measurementType" });
  const watchedSand = useWatch({ control: form.control, name: "sand" });
  const watchedClay = useWatch({ control: form.control, name: "clay" });
  const watchedSilt = useWatch({ control: form.control, name: "silt" });
  const watchedVessScore = useWatch({ control: form.control, name: "vessScore" });


  useEffect(() => {
    // Reset form with appropriate defaults when initialData or settings change
    // Make sure the reset value includes the measurementType
    form.reset(getDefaultValues(initialData, settings));
  }, [initialData, settings, form]); // Add form to dependency array for reset

  const calculatePercentages = useCallback(() => {
     if (watchedMeasurementType === 'composition') {
        const sandCm = Number(watchedSand) || 0;
        const clayCm = Number(watchedClay) || 0;
        const siltCm = Number(watchedSilt) || 0;
        const total = sandCm + clayCm + siltCm;

        if (total > 0) {
            const sandPercent = Math.round((sandCm / total) * 100);
            const clayPercent = Math.round((clayCm / total) * 100);
            // Ensure sum is 100% by adjusting silt
            const siltPercent = 100 - sandPercent - clayPercent;
            return { sandPercent, clayPercent, siltPercent };
        }
     }
     return { sandPercent: undefined, clayPercent: undefined, siltPercent: undefined };
  }, [watchedMeasurementType, watchedSand, watchedClay, watchedSilt]);

  const { sandPercent, clayPercent, siltPercent } = calculatePercentages();

  const handleNextStep = async () => {
     const fieldsToValidate: (keyof SoilFormInputs)[] = ['date', 'location', 'latitude', 'longitude'];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    } else {
       toast({
         variant: 'destructive',
         title: 'Validation Error',
         description: 'Please fill in the required fields for Step 1.',
       });
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

   const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation Error',
        description: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude, { shouldValidate: true });
        form.setValue('longitude', position.coords.longitude, { shouldValidate: true });
        setIsFetchingLocation(false);
        toast({ title: 'Location fetched successfully!' });
      },
      (error) => {
        setIsFetchingLocation(false);
        console.error('Geolocation error:', error);
        toast({
          variant: 'destructive',
          title: 'Geolocation Error',
          description: `Could not get location: ${error.message}`,
        });
      }
    );
  };


  const onSubmit: SubmitHandler<SoilFormInputs> = async (data) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    setIsLoading(true);

    // Prepare data for Firestore, ensuring correct types based on measurementType
    let submissionData: Omit<SoilData, 'id'>;

    if (data.measurementType === 'vess') {
        submissionData = {
            userId: user.uid,
            date: Timestamp.fromDate(data.date),
            location: data.location || undefined,
            latitude: data.latitude ?? undefined, // Use ?? for nullable fields
            longitude: data.longitude ?? undefined,
            measurementType: 'vess',
            vessScore: data.vessScore,
            privacy: data.privacy,
            // Explicitly set composition fields to null/undefined for VESS type
            sand: null,
            clay: null,
            silt: null,
            sandPercent: undefined, // Percentages only exist for composition
            clayPercent: undefined,
            siltPercent: undefined,
        };
    } else { // measurementType is 'composition'
        const calculatedPercentages = calculatePercentages(); // Recalculate on submit just in case
        submissionData = {
            userId: user.uid,
            date: Timestamp.fromDate(data.date),
            location: data.location || undefined,
            latitude: data.latitude ?? undefined,
            longitude: data.longitude ?? undefined,
            measurementType: 'composition',
            sand: data.sand ?? null, // Use ?? null for nullable numbers
            clay: data.clay ?? null,
            silt: data.silt ?? null,
            sandPercent: calculatedPercentages.sandPercent,
            clayPercent: calculatedPercentages.clayPercent,
            siltPercent: calculatedPercentages.siltPercent,
            privacy: data.privacy,
            // Explicitly set VESS score to null/undefined for composition type
            vessScore: null,
        };
    }


     // Remove undefined fields before saving (Firestore handles undefined well, but this ensures cleaner data)
    Object.keys(submissionData).forEach(key => {
      const K = key as keyof typeof submissionData;
      if (submissionData[K] === undefined) {
         delete submissionData[K];
      }
    });


    try {
       if (initialData?.id) {
        // Update existing document
        const docRef = doc(db, `users/${user.uid}/soilData`, initialData.id);
        // Ensure we only update fields relevant to the potentially changed type
        const updatePayload: Partial<SoilData> = { ...submissionData };
        await updateDoc(docRef, updatePayload);
        toast({ title: 'Success', description: 'Soil data updated successfully.' });
       } else {
         // Add new document
        await addDoc(collection(db, `users/${user.uid}/soilData`), submissionData);
        toast({ title: 'Success', description: 'Soil data saved successfully.' });
        form.reset(getDefaultValues(undefined, settings)); // Reset form to initial new state
         setStep(1); // Go back to step 1 after adding
       }

       if (onFormSubmit) {
        onFormSubmit();
      }

    } catch (error: any) {
      console.error('Error saving data:', error);
      toast({
        variant: 'destructive',
        title: 'Error Saving Data',
        description: error.message || 'Could not save soil data. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

   const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
             {/* Date Picker */}
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Sample</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date)}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {/* Location Input */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                     <MapPin className="h-4 w-4" /> Optional: Location / Field Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., North Field, Backyard Plot" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GPS Coordinates */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
               <FormField
                 control={form.control}
                 name="latitude"
                 render={({ field }) => (
                   <FormItem className="flex-1">
                     <FormLabel>Latitude</FormLabel>
                     <FormControl>
                       {/* Allow empty string, convert to number or undefined */}
                       <Input type="number" step="any" placeholder="e.g., 34.0522" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ''} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
                <FormField
                 control={form.control}
                 name="longitude"
                 render={({ field }) => (
                   <FormItem className="flex-1">
                     <FormLabel>Longitude</FormLabel>
                     <FormControl>
                        {/* Allow empty string, convert to number or undefined */}
                       <Input type="number" step="any" placeholder="e.g., -118.2437" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ''} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <Button type="button" variant="outline" onClick={handleGetLocation} disabled={isFetchingLocation} className="flex-shrink-0">
                 <LocateFixed className={`h-4 w-4 ${isFetchingLocation ? 'animate-spin' : ''}`} />
                 <span className="ml-2">{isFetchingLocation ? 'Fetching...' : 'Get Current Location'}</span>
               </Button>
             </div>


            <Button onClick={handleNextStep} className="w-full sm:w-auto">Next Step</Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            {/* Measurement Type Selection */}
            <FormField
              control={form.control}
              name="measurementType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Measurement Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        const newValue = value as 'vess' | 'composition';
                        field.onChange(newValue);
                        // Reset other measurement type fields when switching
                        // Get current form values to preserve data where possible
                         const currentValues = form.getValues();
                         // Create a temporary object with the new measurementType to pass to getDefaultValues
                         const tempObjectForDefaults = {
                            ...currentValues,
                            measurementType: newValue
                         } as SoilData & { id: string }; // Cast needed as we only change type temporarily

                         const newDefaults = getDefaultValues(tempObjectForDefaults, settings);

                        // Reset the form with new defaults based on the selected type
                         form.reset({
                             ...newDefaults, // Use the full default structure for the new type
                             // Keep step 1 data
                             date: currentValues.date,
                             location: currentValues.location,
                             latitude: currentValues.latitude,
                             longitude: currentValues.longitude,
                             privacy: currentValues.privacy,
                         });
                         // Trigger validation after resetting potentially required fields
                         form.trigger();
                      }}
                      value={field.value} // Use value directly
                      className="flex flex-col sm:flex-row gap-4"
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
                          Soil Composition (cm)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Conditional Fields */}
            {watchedMeasurementType === 'vess' && (
              <FormField
                control={form.control}
                name="vessScore"
                 render={({ field: { value, onChange } }) => ( // Added type annotation for safety
                  <FormItem>
                    <FormLabel>VESS Score (1-5)</FormLabel>
                     <FormControl>
                       <>
                        <Slider
                          // defaultValue={[3]} // Remove default value if controlled
                          value={[value ?? 3]} // Ensure value is defined for Slider
                          onValueChange={(vals) => onChange(vals[0])}
                          min={1}
                          max={5}
                          step={1}
                          className="my-4"
                        />
                         <div className="flex justify-between text-xs text-muted-foreground mt-1">
                           <span>Sq1 (Poor)</span>
                           <span>Sq3 (Moderate)</span>
                           <span>Sq5 (Excellent)</span>
                         </div>
                        <div className="mt-4 p-4 border rounded-md bg-background vess-image-container">
                           {VESS_IMAGES.find(img => img.score === (value ?? 3)) && (
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                 <Image
                                    src={VESS_IMAGES.find(img => img.score === (value ?? 3))!.url}
                                    alt={`VESS Score ${value ?? 3}`}
                                    width={100}
                                    height={100}
                                    className="rounded-md border"
                                  />
                                <p className="text-sm">{VESS_IMAGES.find(img => img.score === (value ?? 3))!.description}</p>
                              </div>
                           )}
                        </div>
                        </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedMeasurementType === 'composition' && (
              <div className="space-y-4 p-4 border rounded-md bg-background">
                 <h4 className="font-medium text-md mb-4">Soil Composition (cm)</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="sand"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Sand (cm)</FormLabel>
                         <FormControl>
                           {/* Ensure value is '' if null, and convert back to number or null */}
                           <Input type="number" min="0" step="0.1" placeholder="e.g., 10.5" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ''} />
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
                           <Input type="number" min="0" step="0.1" placeholder="e.g., 5.2" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ''} />
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
                           <Input type="number" min="0" step="0.1" placeholder="e.g., 4.3" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ''} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
                   {/* Display Percentages */}
                   {(sandPercent !== undefined || clayPercent !== undefined || siltPercent !== undefined) && (
                       <div className="mt-4 text-sm text-muted-foreground p-3 bg-secondary rounded-md">
                           Calculated Composition:
                           <span className="font-medium text-foreground ml-2">{sandPercent ?? 0}% Sand</span>,
                           <span className="font-medium text-foreground ml-2">{clayPercent ?? 0}% Clay</span>,
                           <span className="font-medium text-foreground ml-2">{siltPercent ?? 0}% Silt</span>
                       </div>
                   )}
                   {/* Show form-level error if sum is zero */}
                  {form.formState.errors.sand?.type === 'refine' && ( // Check for refine error specifically
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.sand.message}</p>
                  )}
              </div>
            )}

             {/* Privacy Setting */}
             <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Privacy</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                           <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select privacy" />
                           </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4"/> Private (Only You)
                              </div>
                           </SelectItem>
                           <SelectItem value="public">
                               <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4"/> Public (Visible to All)
                              </div>
                           </SelectItem>
                        </SelectContent>
                     </Select>
                    <FormDescription>
                      Set who can see this data entry.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


            {/* Navigation and Submit Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={handlePrevStep}>
                Previous Step
              </Button>
              <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                {isLoading ? (initialData ? 'Updating...' : 'Submitting...') : (initialData ? 'Update Data' : 'Submit Data')}
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  return (
     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         {renderStepContent()}
       </form>
    </Form>
  );
}
