
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { SoilData } from '@/types/soil';
import { format, isValid, parseISO } from 'date-fns';
import { LoadingSpinner } from './loading-spinner';
import { AlertTriangle } from 'lucide-react';

// Define chart data types
interface VessChartData {
  date: string; // Formatted date string for XAxis
  vessScore: number | null;
  originalDate: Date; // Store original date for sorting
}

interface CompositionChartData {
  date: string; // Formatted date string for XAxis
  sandPercent: number | null;
  clayPercent: number | null;
  siltPercent: number | null;
  originalDate: Date; // Store original date for sorting
}

// Helper function to check if a value is a valid number
const isValidNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);


export function SoilDataCharts() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const [soilData, setSoilData] = useState<Array<SoilData & { id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setSoilData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const dataPath = `users/${user.uid}/soilData`;
     console.log("SoilDataCharts: Setting up charts listener for path:", dataPath); // Debug log

    const q = query(
      collection(db, dataPath),
      orderBy('date', 'asc') // Order by date ascending for charts
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
         console.log(`SoilDataCharts: Charts snapshot received: ${querySnapshot.size} documents.`); // Debug log
        const data: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
            const docData = doc.data();
            console.log(`SoilDataCharts: Charts processing doc ${doc.id}:`, docData); // Debug log

           // Ensure the date field is a Firestore Timestamp and valid
           let date = docData.date;
            if (!(date instanceof Timestamp)) {
               console.warn(`SoilDataCharts: Charts: Doc ${doc.id} has non-Timestamp date:`, docData.date, typeof docData.date);
               try {
                 const potentialDate = new Date(date);
                 if (isValid(potentialDate)) {
                    date = Timestamp.fromDate(potentialDate);
                     console.log(`SoilDataCharts: Charts: Converted date for doc ${doc.id} to Timestamp:`, date); // Debug log
                 } else {
                    console.warn(`SoilDataCharts: Charts: Doc ${doc.id} has invalid date format, skipping.`);
                    return;
                 }
               } catch (e) {
                 console.error(`SoilDataCharts: Charts: Error converting date for doc ${doc.id}:`, e);
                 return;
               }
           }
           // Further validation on the converted Timestamp's date
            const jsDate = date.toDate();
            if (!isValid(jsDate)) {
                console.warn(`SoilDataCharts: Charts: Doc ${doc.id} date is invalid after conversion, skipping.`);
                return;
            }


            // Minimal structure check
             if (!docData.measurementType) {
                console.warn(`SoilDataCharts: Charts: Doc ${doc.id} missing measurementType, skipping.`);
                return;
            }

           data.push({
             id: doc.id,
              userId: docData.userId || user.uid,
              date: date, // Use the validated/converted Timestamp
              location: docData.location,
              locationOption: docData.locationOption ?? (docData.latitude ? 'gps' : (docData.location ? 'manual' : undefined)),
              latitude: docData.latitude,
              longitude: docData.longitude,
              measurementType: docData.measurementType,
              vessScore: docData.vessScore,
              sand: docData.sand,
              clay: docData.clay,
              silt: docData.silt,
              sandPercent: docData.sandPercent,
              clayPercent: docData.clayPercent,
              siltPercent: docData.siltPercent,
              privacy: docData.privacy || 'private',
           });
        });
         console.log("SoilDataCharts: Charts processed data:", data); // Debug log
        setSoilData(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('SoilDataCharts: Error fetching soil data for charts:', err);
        setError('Failed to fetch soil data for charts. Check console.');
        setIsLoading(false);
      }
    );

    return () => {
        console.log("SoilDataCharts: Unsubscribing from charts Firestore listener."); // Debug log
        unsubscribe();
    }
  }, [user, db]);

  const { vessChartData, compositionChartData } = useMemo(() => {
    const vessData: VessChartData[] = [];
    const compositionData: CompositionChartData[] = [];
     console.log("SoilDataCharts: Generating chart data from processed state:", soilData); // Log chart data generation

    soilData.forEach(item => {
       // Date is already validated as Timestamp in useEffect
       if (!item.date || !isValid(item.date.toDate())) {
           console.warn(`SoilDataCharts: Skipping item ${item.id} in chart generation due to invalid date.`);
           return;
       }
       const itemDate = item.date.toDate();

       const dateStr = format(itemDate, 'MMM d, yy');

       // console.log(`SoilDataCharts: Processing item ${item.id} for charts: Type=${item.measurementType}, VESS=${item.vessScore}, SandP=${item.sandPercent}`);

       if (item.measurementType === 'vess' && isValidNumber(item.vessScore)) {
         vessData.push({ date: dateStr, vessScore: item.vessScore, originalDate: itemDate });
       } else if (item.measurementType === 'composition') {
          // Use calculated percentages ONLY if they are valid numbers
          const sandP = isValidNumber(item.sandPercent) ? item.sandPercent : null;
          const clayP = isValidNumber(item.clayPercent) ? item.clayPercent : null;
          const siltP = isValidNumber(item.siltPercent) ? item.siltPercent : null;

           // Only add if at least one valid percentage is present
           if (sandP !== null || clayP !== null || siltP !== null) {
             compositionData.push({
               date: dateStr,
               sandPercent: sandP,
               clayPercent: clayP,
               siltPercent: siltP,
               originalDate: itemDate,
             });
           } else {
               console.warn(`SoilDataCharts: Skipping composition chart entry for ${item.id} due to missing/invalid percentage data.`)
           }
       } else {
            // console.log(`SoilDataCharts: Item ${item.id} did not match chart criteria.`);
       }
    });

    // Sort explicitly by original date just in case Firestore order isn't perfect or data gets reshuffled
    vessData.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
    compositionData.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());

    console.log("SoilDataCharts: Generated VESS Chart Data:", vessData);
    console.log("SoilDataCharts: Generated Composition Chart Data:", compositionData);

    return { vessChartData: vessData, compositionChartData: compositionData };
  }, [soilData]);

  if (isLoading && soilData.length === 0) { // Show loading only initially
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner />
        <p className="ml-2">Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 rounded-md bg-destructive/10">
         <AlertTriangle className="h-5 w-5" />
         <div>
            <p className="font-semibold">Error Loading Charts</p>
            <p>{error}</p>
         </div>
      </div>
    );
  }

  const hasVessData = vessChartData.length > 0; // Allow chart with one point
  const hasCompositionData = compositionChartData.length > 0; // Allow chart with one point
  const needsMoreVessData = vessChartData.length < 2;
  const needsMoreCompositionData = compositionChartData.length < 2;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* VESS Score Chart */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>VESS Score Over Time</CardTitle>
           <CardDescription>Visual Evaluation of Soil Structure (1=Poor, 5=Excellent)</CardDescription>
        </CardHeader>
        <CardContent>
          {hasVessData ? (
             <ChartContainer config={{
                vessScore: { label: "VESS Score", color: "hsl(var(--chart-1))" }, // Green
              }} className="h-[300px] w-full">
              <ResponsiveContainer>
                 <AreaChart data={vessChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} interval="preserveStartEnd" />
                   <YAxis domain={[0, 5]} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} ticks={[1, 2, 3, 4, 5]} width={30}/>
                   <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1 }} />
                   <defs>
                       <linearGradient id="fillVess" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                       </linearGradient>
                   </defs>
                   <Area
                    dataKey="vessScore"
                    type="monotone"
                    fill="url(#fillVess)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    stackId="a" // Use stackId if you plan to stack areas later
                    connectNulls // Connect lines even if there are missing data points
                    dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">
                No VESS score data available. Add some VESS entries first.
            </p>
          )}
           {hasVessData && needsMoreVessData && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                 Add more VESS entries to see a trend line.
               </p>
           )}
        </CardContent>
      </Card>

       {/* Soil Composition Chart */}
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Soil Composition (%) Over Time</CardTitle>
           <CardDescription>Percentage of Sand, Clay, and Silt</CardDescription>
        </CardHeader>
        <CardContent>
           {hasCompositionData ? (
             <ChartContainer config={{
                 sandPercent: { label: "Sand", color: "hsl(var(--chart-3))" }, // Ochre/Yellow
                 clayPercent: { label: "Clay", color: "hsl(var(--chart-2))" }, // Brown
                 siltPercent: { label: "Silt", color: "hsl(var(--chart-1))" }, // Green (using chart-1 for silt now)
              }} className="h-[300px] w-full">
                <ResponsiveContainer>
                   {/* Changed to stackOffset="expand" for 100% stacked area chart */}
                   <AreaChart data={compositionChartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }} stackOffset="expand">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} interval="preserveStartEnd"/>
                     {/* Y axis represents percentage 0-1 when stackOffset="expand" */}
                     <YAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                     <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(value) => `${(value * 100).toFixed(0)}%`} />} cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1 }}/>
                     <ChartLegend content={<ChartLegendContent verticalAlign="bottom" wrapperStyle={{ bottom: 0, left: 20 }}/>} />
                     <defs>
                        <linearGradient id="fillSand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="fillClay" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                        </linearGradient>
                         <linearGradient id="fillSilt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                     <Area
                       dataKey="sandPercent"
                       name="Sand" // Name used by legend/tooltip
                       type="monotone"
                       fill="url(#fillSand)"
                       stroke="hsl(var(--chart-3))"
                       strokeWidth={2}
                       stackId="composition" // All areas need the same stackId
                       connectNulls
                     />
                     <Area
                       dataKey="clayPercent"
                       name="Clay"
                       type="monotone"
                       fill="url(#fillClay)"
                       stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                       stackId="composition"
                       connectNulls
                     />
                     <Area
                       dataKey="siltPercent"
                       name="Silt"
                       type="monotone"
                       fill="url(#fillSilt)"
                       stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                       stackId="composition"
                       connectNulls
                     />
                  </AreaChart>
                </ResponsiveContainer>
            </ChartContainer>
           ) : (
             <p className="text-muted-foreground text-center py-10">
                No soil composition data (with percentages) available. Add some composition entries first.
             </p>
           )}
            {hasCompositionData && needsMoreCompositionData && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                 Add more composition entries to see a trend line.
               </p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
