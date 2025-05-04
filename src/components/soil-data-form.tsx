
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getLocationDetails } from '@/ai/flows/get-location-details-flow'; // Import the new flow


// Base schema for common fields
const baseSchema = z.object({
  // Keep date as z.date(), default will be handled by useForm
  date: z.date(),
  locationOption: z.enum(['gps', 'manual']).default('gps'),
  manualLocation: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  privacy: z.enum(['public', 'private']),
});

// Schema for VESS measurement
const vessSpecificSchema = z.object({
  measurementType: z.literal('vess'),
  vessScore: z.number().min(1).max(5).default(3),
});

// Schema for Composition measurement
const compositionSpecificSchema = z.object({
  measurementType: z.literal('composition'),
  sand: z.number().min(0, "Cannot be negative").optional(),
  clay: z.number().min(0, "Cannot be negative").optional(),
  silt: z.number().min(0, "Cannot be negative").optional(),
  // Ensure percentages are optional as they are calculated
  sandPercent: z.number().optional(),
  clayPercent: z.number().optional(),
  siltPercent: z.number().optional(),
});

// Define the individual schemas with the measurementType literal
const vessFormSchema = baseSchema.extend({
  measurementType: z.literal('vess'),
  vessScore: z.number().min(1).max(5).default(3),
  // Add nulls for composition fields to satisfy the union base
  sand: z.null().optional(),
  clay: z.null().optional(),
  silt: z.null().optional(),
  sandPercent: z.null().optional(),
  clayPercent: z.null().optional(),
  siltPercent: z.null().optional(),
});

const compositionFormSchema = baseSchema.extend({
  measurementType: z.literal('composition'),
  sand: z.number().min(0, "Cannot be negative").optional(),
  clay: z.number().min(0, "Cannot be negative").optional(),
  silt: z.number().min(0, "Cannot be negative").optional(),
  sandPercent: z.number().optional(),
  clayPercent: z.number().optional(),
  siltPercent: z.number().optional(),
   // Add nulls for VESS fields
  vessScore: z.null().optional(),
});


// Combine schemas using discriminated union
const formSchema = z.discriminatedUnion('measurementType', [
  vessFormSchema,
  compositionFormSchema,
]).refine(data => {
    // Validation for manual location
    if (data.locationOption === 'manual') {
      return typeof data.manualLocation === 'string' && data.manualLocation.trim().length > 0;
    }
    return true;
}, {
    message: "Manual location name is required when selected.",
    path: ['manualLocation'],
}).refine(data => {
    // Validation for GPS location (ensure coords exist if GPS is chosen)
    // Allow submission even if GPS fails initially, as user might proceed without it
    // Error handling for GPS fetching failure is done in the UI instead
    return true;
}).refine(data => {
    // Validation for composition measurements
    if (data.measurementType === 'composition') {
        // Check if at least one value is provided and is a number >= 0
        const hasSand = typeof data.sand === 'number' && data.sand >= 0;
        const hasClay = typeof data.clay === 'number' && data.clay >= 0;
        const hasSilt = typeof data.silt === 'number' && data.silt >= 0;
        // If any value is entered, it must be non-negative
        if ((data.sand !== undefined && data.sand !== null && !hasSand) || (data.clay !== undefined && data.clay !== null && !hasClay) || (data.silt !== undefined && data.silt !== null && !hasSilt)) {
            return false; // Found a negative value
        }
        // Allow submission if any value is 0, require at least one non-zero positive value for calculation? Let's allow zeros.
        const anyValueEntered = data.sand !== undefined || data.clay !== undefined || data.silt !== undefined;
        // If any value is entered, at least one must be >= 0 (which is covered by the negative check above)
        // But we need to ensure *something* is entered. Let's adjust: at least one must be defined and non-negative.
         const isValidComposition = (data.sand === undefined || hasSand) &&
                                  (data.clay === undefined || hasClay) &&
                                  (data.silt === undefined || hasSilt) &&
                                  (hasSand || hasClay || hasSilt); // At least one must be defined and non-negative

        return isValidComposition;
    }
    return true;
}, {
    // Updated message to be clearer about non-negative requirement
    message: "At least one measurement (Sand, Clay, or Silt) must be provided and be a non-negative number (0 or greater) for composition.",
    path: ['sand'], // Apply error to one field, or handle more granularly
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
  const [error, setError] = useState<string | null>(null); // General form error
  const [gpsError, setGpsError] = useState<string | null>(null); // Specific GPS error
  const [loading, setLoading] = useState(false); // Form submission loading
  const [isGpsLoading, setIsGpsLoading] = useState(false); // GPS fetching loading
  const [step, setStep] = useState(1);
  // Measurement type state controls which fields are shown in step 2
  const [measurementType, setMeasurementType] = useState<'vess' | 'composition' | undefined>(initialData?.measurementType);
  const [selectedVessScore, setSelectedVessScore] = useState<number>(initialData?.vessScore ?? 3); // Default VESS score for slider visual
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // State for calendar popover
  const [locationDetailsLoading, setLocationDetailsLoading] = useState(false); // Loading state for reverse geocoding


  const form = useForm<SoilFormInputs>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date?.toDate() ?? new Date(), // Initialize with current date or initial data
      locationOption: initialData?.latitude ? 'gps' : (initialData?.location ? 'manual' : 'gps'),
      manualLocation: initialData?.location ?? '',
      latitude: initialData?.latitude ?? undefined, // Use undefined if null from initialData
      longitude: initialData?.longitude ?? undefined, // Use undefined if null from initialData
      privacy: initialData?.privacy ?? settings?.defaultPrivacy ?? 'private',
      measurementType: initialData?.measurementType ?? 'vess', // Default to vess if no initial data or type
      // Conditional defaults based on measurement type
      ...(initialData?.measurementType === 'vess'
        ? { vessScore: initialData.vessScore ?? 3 }
        : { vessScore: 3 } // Default if new or type changes
      ),
      ...(initialData?.measurementType === 'composition'
        ? { sand: initialData.sand ?? undefined, clay: initialData.clay ?? undefined, silt: initialData.silt ?? undefined } // Use undefined if null
        : { sand: undefined, clay: undefined, silt: undefined } // Default if new or type changes
      ),
    },
     mode: 'onChange', // Validate on change for better UX
  });

  const watchMeasurementType = form.watch('measurementType');
  const watchLocationOption = form.watch('locationOption');
  const watchVessScore = form.watch('vessScore');
  const watchSand = form.watch('sand');
  const watchClay = form.watch('clay');
  const watchSilt = form.watch('silt');


   // Update visual VESS score when form value changes
   useEffect(() => {
    if (watchVessScore !== undefined && watchVessScore !== null) {
      setSelectedVessScore(watchVessScore);
    }
  }, [watchVessScore]);

   // Handle measurement type change in form state
   useEffect(() => {
    // Set the local state used for rendering Step 2 header
    setMeasurementType(watchMeasurementType);

     // Also update the form's measurementType - this might be redundant if watch is working,
     // but ensures consistency if there were issues with watch propagation.
     // If the type changes, clear the values of the *other* type.
     if (watchMeasurementType === 'vess') {
         form.resetField('sand');
         form.resetField('clay');
         form.resetField('silt');
         // Ensure VESS score has a default if it was previously undefined or null
         if (form.getValues('vessScore') === undefined || form.getValues('vessScore') === null) {
            form.setValue('vessScore', 3, { shouldValidate: true });
            setSelectedVessScore(3); // Sync visual state
         }
     } else if (watchMeasurementType === 'composition') {
         form.resetField('vessScore');
     }

   }, [watchMeasurementType, form]);


  const handleGetGps = () => {
    setIsGpsLoading(true);
    setGpsError(null); // Clear previous GPS errors
    setLocationDetailsLoading(false); // Reset location details loading
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude, { shouldValidate: true });
          form.setValue('longitude', position.coords.longitude, { shouldValidate: true });
          setIsGpsLoading(false);
          setGpsError(null); // Clear error on success
          toast({title: "GPS Location Obtained", description: "Coordinates successfully fetched."})
          // Automatically trigger reverse geocoding after getting coordinates
          // fetchLocationDetails(position.coords.latitude, position.coords.longitude); // Now handled in onSubmit
        },
        (error) => {
          console.error("Geolocation error:", error);
          setGpsError(`GPS Error: ${error.message}. Please ensure location services are enabled and permissions granted.`);
          setIsGpsLoading(false);
          toast({variant: "destructive", title: "GPS Error", description: "Could not obtain location. You may need to grant permission or enter manually."})
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Standard options
      );
    } else {
      setGpsError("Geolocation is not supported by this browser.");
      setIsGpsLoading(false);
        toast({variant: "destructive", title: "GPS Not Supported", description: "Try entering location manually."})
    }
  };

   // Get GPS automatically if option is selected and no coords exist, only on initial load or manual switch TO gps
   useEffect(() => {
    if (watchLocationOption === 'gps' && form.getValues('latitude') === undefined && !isGpsLoading && !initialData?.latitude) {
       // Fetch only if GPS is selected, no coords exist yet, not already loading, and not editing existing GPS data
        handleGetGps();
    }
    // Clear GPS error if user switches to manual
    if (watchLocationOption === 'manual') {
        setGpsError(null);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [watchLocationOption, initialData]); // Rerun when option changes or initial data loads


  const calculatePercentages = () => {
    const sandCm = form.getValues('sand') ?? 0;
    const clayCm = form.getValues('clay') ?? 0;
    const siltCm = form.getValues('silt') ?? 0;
    const total = sandCm + clayCm + siltCm;

    if (total <= 0) { // Ensure total is positive to avoid division by zero or negative percentages
        return { sandPercent: null, clayPercent: null, siltPercent: null }; // Return nulls
    }

    // Calculate percentages
    let sandP = (sandCm / total) * 100;
    let clayP = (clayCm / total) * 100;
    let siltP = (siltCm / total) * 100;

    // Adjust rounding to ensure total is 100%
    // A simple method: round all, then adjust the largest one to make sum 100
    let sandRounded = Math.round(sandP);
    let clayRounded = Math.round(clayP);
    let siltRounded = Math.round(siltP);
    let totalRounded = sandRounded + clayRounded + siltRounded;

    if (totalRounded !== 100) {
        const diff = 100 - totalRounded;
        // Find which one had the largest rounding difference or is the largest component
        const diffs = [
            { val: sandRounded, diff: Math.abs(sandP - sandRounded), name: 'sand' },
            { val: clayRounded, diff: Math.abs(clayP - clayRounded), name: 'clay' },
            { val: siltRounded, diff: Math.abs(siltP - siltRounded), name: 'silt' },
        ];
        // Sort by largest value primarily, then by largest rounding error secondarily
        diffs.sort((a, b) => b.val - a.val || b.diff - a.diff);

        // Apply the difference to the component that needs it most
        if (diffs[0].name === 'sand') sandRounded += diff;
        else if (diffs[0].name === 'clay') clayRounded += diff;
        else siltRounded += diff; // Default to silt if others aren't adjusted

        // Ensure no percentage goes below 0 after adjustment (unlikely but possible with edge cases)
        sandRounded = Math.max(0, sandRounded);
        clayRounded = Math.max(0, clayRounded);
        siltRounded = Math.max(0, siltRounded);

        // Recalculate total and make final small adjustments if needed (rare)
        totalRounded = sandRounded + clayRounded + siltRounded;
        if (totalRounded !== 100) {
           const finalDiff = 100 - totalRounded;
           // Apply final adjustment to the largest component again or a default (e.g., sand)
           const maxVal = Math.max(sandRounded, clayRounded, siltRounded);
           if (sandRounded === maxVal) sandRounded += finalDiff;
           else if (clayRounded === maxVal) clayRounded += finalDiff;
           else siltRounded += finalDiff;
        }
    }

    return {
        sandPercent: sandRounded,
        clayPercent: clayRounded,
        siltPercent: siltRounded,
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
    setGpsError(null); // Clear errors on submit attempt
    setLocationDetailsLoading(false); // Reset reverse geocoding loading

    let locationDetails: { country?: string; region?: string; city?: string } = {};

    // Fetch location details *before* saving if GPS is selected and coords exist
    if (data.locationOption === 'gps' && data.latitude && data.longitude) {
        setLocationDetailsLoading(true);
        try {
            locationDetails = await getLocationDetails({
                latitude: data.latitude,
                longitude: data.longitude,
            });
            console.log("Reverse geocoding successful:", locationDetails);
        } catch (geoError) {
            console.error("Reverse geocoding error:", geoError);
            toast({
                variant: "default", // Use default, not destructive, as it's non-critical
                title: "Location Details Unavailable",
                description: "Could not fetch country/region for the coordinates.",
            });
            // Proceed without location details, don't block submission
        } finally {
            setLocationDetailsLoading(false);
        }
    }


    try {
      // Prepare data common to both types
      const baseData = {
        userId: user.uid,
        date: Timestamp.fromDate(data.date), // Use the selected date
        privacy: data.privacy,
        locationOption: data.locationOption, // Save the option chosen
        ...(data.locationOption === 'manual'
            ? { location: data.manualLocation, latitude: null, longitude: null, country: null, region: null, city: null } // Clear all location fields for manual
            : {
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                location: null, // Explicitly null for GPS
                country: locationDetails.country ?? null, // Add fetched details or null
                region: locationDetails.region ?? null,
                city: locationDetails.city ?? null,
              }
        ),
      };

      let finalData: Omit<SoilData, 'id'>; // Use SoilData type without id

      if (data.measurementType === 'vess') {
        finalData = {
          ...baseData,
          measurementType: 'vess',
          vessScore: data.vessScore ?? null, // Ensure null if undefined
          // Ensure composition fields are explicitly null
          sand: null,
          clay: null,
          silt: null,
          sandPercent: null,
          clayPercent: null,
          siltPercent: null,
        };
      } else if (data.measurementType === 'composition') {
          const percentages = calculatePercentages();
          finalData = {
            ...baseData,
            measurementType: 'composition',
            sand: data.sand ?? null, // Ensure null if undefined
            clay: data.clay ?? null, // Ensure null if undefined
            silt: data.silt ?? null, // Ensure null if undefined
            sandPercent: percentages.sandPercent ?? null, // Ensure null if undefined/null
            clayPercent: percentages.clayPercent ?? null, // Ensure null if undefined/null
            siltPercent: percentages.siltPercent ?? null, // Ensure null if undefined/null
            // Ensure VESS field is explicitly null
            vessScore: null,
        };
      } else {
        // This case should technically not be reachable due to Zod validation
        throw new Error("Invalid measurement type selected");
      }

      // Clean finalData: Remove undefined fields before sending to Firestore
       Object.keys(finalData).forEach(key => {
           const typedKey = key as keyof typeof finalData;
           if (finalData[typedKey] === undefined) {
               (finalData as any)[typedKey] = null; // Convert undefined to null for Firestore compatibility
           }
       });


      if (initialData?.id) {
         // Update existing document
         const docRef = doc(db, `users/${user.uid}/soilData`, initialData.id);
         await updateDoc(docRef, finalData);
         toast({ title: 'Data Updated', description: 'Soil sample data successfully updated.' });
      } else {
          // Add new document
          const docRef = await addDoc(collection(db, `users/${user.uid}/soilData`), finalData);
          console.log("Document written with ID: ", docRef.id);

          toast({ title: 'Data Saved', description: 'New soil sample data successfully saved.' });

          // Reset form to defaults AFTER successful submission
          form.reset({
            date: new Date(), // Reset date to current date
            locationOption: 'gps',
            manualLocation: '',
            latitude: undefined, // Reset coords explicitly
            longitude: undefined,
            privacy: settings?.defaultPrivacy ?? 'private',
            measurementType: 'vess', // Reset to default type
            vessScore: 3,
            sand: undefined,
            clay: undefined,
            silt: undefined,
          });

          setMeasurementType('vess'); // Reset local state for UI
          setSelectedVessScore(3); // Reset visual VESS score
          setStep(1); // Reset steps
      }


      if (onFormSubmit) {
        onFormSubmit(); // Callback to potentially switch tabs or update UI
      }
    } catch (error: any) {
      console.error('Error saving data:', error);
      // Display specific Zod errors if available, otherwise general error
      const errorMessage = error instanceof z.ZodError
          ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          : error.message || 'Failed to save soil data. Please try again.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
     // Define fields to validate for Step 1
     const step1Fields: Array<keyof SoilFormInputs> = [
         'date', 'locationOption', 'manualLocation', 'latitude', 'longitude', 'privacy', 'measurementType'
     ];
     // Manually trigger validation for Step 1 fields
     const result = await form.trigger(step1Fields);

     // Additionally check if measurementType has a value
     const currentMeasurementType = form.getValues('measurementType');

     if (result && currentMeasurementType) {
        setError(null); // Clear general error if validation passes
        setStep(2);
     } else {
         if (!currentMeasurementType) {
             // Set error manually if measurementType is still missing
             form.setError('measurementType', { type: 'manual', message: 'Please select a measurement type.' });
         }
        // Triggering validation should show errors in the form fields
        toast({ variant: "destructive", title: "Validation Error", description: "Please fill in all required fields for Step 1 correctly." });
     }
  };
  const prevStep = () => setStep(1);

  // Recalculate percentages whenever relevant inputs change
   const percentages = useMemo(() => {
        if (watchMeasurementType === 'composition') {
             return calculatePercentages();
        }
        return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchMeasurementType, watchSand, watchClay, watchSilt, form]); // Recalculate when type or values change


  return (
    <Form {...form}>
      {/* Pass form context to the actual form element */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Display general form errors */}
        {error && !error.includes("measurementType") && !error.includes("locationOption") && !error.includes("manualLocation") && ( // Avoid duplicating errors shown by fields
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
         {/* Display GPS specific errors */}
         {gpsError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>GPS Error</AlertTitle>
            <AlertDescription>{gpsError}</AlertDescription>
          </Alert>
        )}


        {/* Step 1: Date, Location, Privacy, Measurement Type */}
        <div className={step === 1 ? 'block' : 'hidden'}>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Step 1: General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

             {/* Date Picker */}
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>📅 Date</FormLabel>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP") // Format selected date nicely
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
                                // Update form value and close popover on select
                                onSelect={(date) => {
                                    field.onChange(date);
                                    setIsCalendarOpen(false); // Close calendar after selection
                                }}
                                // Optionally disable future dates if needed
                                // disabled={(date) => date > new Date()}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
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
                        onValueChange={(value: 'gps' | 'manual') => {
                            field.onChange(value); // Update form state
                            // Clear the other option's value and potentially trigger GPS fetch
                            if (value === 'gps') {
                                form.setValue('manualLocation', '', { shouldValidate: true }); // Clear and validate
                                // Attempt to get GPS only if no coordinates exist
                                if (form.getValues('latitude') === undefined) {
                                    handleGetGps();
                                }
                            } else {
                                form.setValue('latitude', undefined, { shouldValidate: false }); // Clear without immediate validation
                                form.setValue('longitude', undefined, { shouldValidate: false }); // Clear without immediate validation
                                setGpsError(null); // Clear GPS error when switching to manual
                            }
                        }}
                        value={field.value}
                        className="flex space-x-4"
                    >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="gps" id="location-gps"/>
                            </FormControl>
                            <Label htmlFor="location-gps" className="font-normal cursor-pointer">Use GPS</Label>
                             {isGpsLoading && <LoadingSpinner size={16}/>}
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="manual" id="location-manual"/>
                            </FormControl>
                            <Label htmlFor="location-manual" className="font-normal cursor-pointer">Enter Manually</Label>
                        </FormItem>
                    </RadioGroup>
                    </FormControl>

                    {/* Conditionally show Manual Input or GPS status */}
                    {field.value === 'manual' && (
                         <FormField
                            control={form.control}
                            name="manualLocation"
                            render={({ field: manualField }) => (
                                <FormItem className="mt-2">
                                    <FormControl>
                                        <Input placeholder="E.g., Back Field, Plot 3B" {...manualField} />
                                    </FormControl>
                                    <FormMessage /> {/* Shows validation errors for manualLocation */}
                                </FormItem>
                            )}
                            />
                    )}
                     {field.value === 'gps' && form.getValues('latitude') !== undefined && !isGpsLoading && !gpsError && (
                         <p className="text-sm text-muted-foreground mt-2">
                         Coordinates: {form.getValues('latitude')?.toFixed(4)}, {form.getValues('longitude')?.toFixed(4)}
                       </p>
                    )}
                    {/* Display GPS error inline if relevant */}
                    {field.value === 'gps' && gpsError && (
                        <p className="text-sm text-destructive mt-2">{gpsError}</p>
                    )}
                     {/* General message area for locationOption validation itself (less common) */}
                     <FormMessage />
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
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={settings?.defaultPrivacy ?? 'private'}>
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
                        Affects visibility of this data. Default is '{settings?.defaultPrivacy ?? 'private'}'.
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
                         // Use field.onChange provided by Controller
                         onValueChange={field.onChange}
                         value={field.value} // Controlled component
                         className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                        >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                             <RadioGroupItem value="vess" id="type-vess"/>
                            </FormControl>
                            <Label htmlFor="type-vess" className="font-normal cursor-pointer">
                             VESS Score (Visual Evaluation)
                            </Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="composition" id="type-composition" />
                            </FormControl>
                            <Label htmlFor="type-composition" className="font-normal cursor-pointer">
                             Soil Composition (Sand/Clay/Silt in cm)
                            </Label>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                     {/* Display error message specifically for measurementType */}
                     <FormMessage />
                    </FormItem>
                )}
            />
          </div>
          <div className="mt-6 flex justify-end">
             {/* Disable button if no measurement type is selected */}
             <Button type="button" onClick={nextStep} >
              Next Step &rarr;
            </Button>
          </div>
        </div>


        {/* Step 2: Measurement Details */}
        <div className={step === 2 ? 'block' : 'hidden'}>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                 Step 2: {measurementType === 'vess' ? 'VESS Score Details' : measurementType === 'composition' ? 'Soil Composition Details' : 'Measurement Details'}
            </h2>

           {/* Conditional Fields based on measurementType state */}
           {measurementType === 'vess' && (
             <FormField
                control={form.control}
                name="vessScore"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>VESS Score (1-5)</FormLabel>
                     <FormControl>
                        {/* Use a simple div wrapper, Fragment caused issues with IDs */}
                         <div>
                          <Slider
                              // Controlled component: value MUST come from field.value
                              value={[field.value ?? 3]} // Provide default if field.value is undefined/null
                              min={1}
                              max={5}
                              step={1}
                              onValueChange={(value) => {
                                  field.onChange(value[0]); // Update form state via Controller
                                  // Visual state update is handled by useEffect watching field.value
                              }}
                              className="my-4"
                              />
                             <div className="flex justify-between text-sm text-muted-foreground mt-2 px-1">
                                <span>1 (Poor)</span>
                                <span>2</span>
                                <span>3 (Mod)</span>
                                <span>4</span>
                                <span>5 (Excel)</span>
                             </div>
                            {/* Display Image and Description based on visual state */}
                             {selectedVessScore >= 1 && selectedVessScore <= 5 && (
                                <div className="mt-4 p-4 border rounded-md bg-muted/30 flex flex-col sm:flex-row items-center gap-4">
                                    <Image
                                        src={VESS_IMAGES[selectedVessScore]}
                                        alt={`VESS Score ${selectedVessScore}`}
                                        width={150}
                                        height={150}
                                        className="rounded-md border vess-image-container"
                                        priority={false} // Smaller images, maybe not priority
                                        data-ai-hint={`soil structure VESS score ${selectedVessScore}`}
                                    />
                                    <p className="text-center sm:text-left text-sm">{VESS_DESCRIPTIONS[selectedVessScore]}</p>
                                </div>
                             )}
                         </div>
                     </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
           )}

            {measurementType === 'composition' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="sand"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sand (cm)</FormLabel>
                                <FormControl>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g., 5.5"
                                    {...field}
                                    // Controlled input: Handle number conversion
                                    value={field.value ?? ''} // Display empty string if undefined/null
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
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
                                 <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g., 2.0"
                                     {...field}
                                     value={field.value ?? ''}
                                     onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
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
                                 <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="e.g., 3.5"
                                     {...field}
                                     value={field.value ?? ''}
                                     onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                     />
                                </FormControl>
                                 <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     {/* Display Calculated Percentages */}
                      {percentages && (percentages.sandPercent !== null || percentages.clayPercent !== null || percentages.siltPercent !== null) && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/30">
                             <h4 className="font-medium mb-2 text-center">Calculated Composition (%)</h4>
                             <div className="flex justify-around text-center gap-4">
                                <div>
                                    {/* Adjusted text colors for better contrast/meaning */}
                                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-500">{percentages.sandPercent ?? '--'}%</p>
                                    <p className="text-sm text-muted-foreground">Sand</p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-orange-800 dark:text-orange-400">{percentages.clayPercent ?? '--'}%</p>
                                     <p className="text-sm text-muted-foreground">Clay</p>
                                </div>
                                 <div>
                                    <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">{percentages.siltPercent ?? '--'}%</p>
                                     <p className="text-sm text-muted-foreground">Silt</p>
                                </div>
                            </div>
                            <p className="text-xs text-center mt-2 text-muted-foreground">Note: Percentages are rounded and adjusted to sum to 100%.</p>
                        </div>
                     )}
                      {/* Display combined error for composition fields if needed (from refine) */}
                      {form.formState.errors.sand?.type === 'manual' && form.formState.errors.sand.message && (
                           <Alert variant="destructive" className="mt-4">
                               <AlertTriangle className="h-4 w-4" />
                               <AlertTitle>Input Required</AlertTitle>
                               <AlertDescription>{form.formState.errors.sand.message}</AlertDescription>
                            </Alert>
                      )}

                 </div>
            )}

            <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                 &larr; Previous Step
                 </Button>
                 {/* Submit button */}
                 <Button type="submit" disabled={loading || locationDetailsLoading || !form.formState.isValid}>
                     {loading ? (initialData ? 'Updating...' : 'Saving...') : (locationDetailsLoading ? 'Getting location...' : (initialData ? 'Update Data' : 'Save Data'))}
                 </Button>
            </div>
        </div>
      </form>
    </Form>
  );
}
