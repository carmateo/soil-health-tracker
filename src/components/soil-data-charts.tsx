
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { SoilData } from '@/types/soil';
import { format, isValid, parseISO } from 'date-fns';
import { LoadingSpinner } from './loading-spinner';
import { AlertTriangle } from 'lucide-react';

// Define chart data types
interface VessChartData {
  date: string; // Formatted date string for XAxis
  vessScore: number | null;
}

interface CompositionChartData {
  date: string; // Formatted date string for XAxis
  sandPercent: number | null;
  clayPercent: number | null;
  siltPercent: number | null;
}

export function SoilDataCharts() { // ✨ Removed data prop
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

    const q = query(
      collection(db, `users/${user.uid}/soilData`),
      orderBy('date', 'asc') // Order by date ascending for charts
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
           // Ensure the date field is a Firestore Timestamp before using
           const docData = doc.data();
           let date = docData.date;
            if (!(date instanceof Timestamp)) {
                // Attempt conversion if it's a string or number
                try {
                    const parsedDate = new Date(date);
                    if (isValid(parsedDate)) {
                      date = Timestamp.fromDate(parsedDate);
                    } else {
                      console.warn(`Document ${doc.id} has invalid date format for charts:`, docData.date);
                      return; // Skip if date is invalid
                    }
                } catch (e) {
                    console.warn(`Document ${doc.id} failed date conversion for charts:`, docData.date, e);
                    return; // Skip on error
                }
           }
          data.push({ id: doc.id, ...docData, date } as SoilData & { id: string });
        });
        setSoilData(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching soil data for charts:', err);
        setError('Failed to fetch soil data for charts.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  const { vessChartData, compositionChartData } = useMemo(() => {
    const vessData: VessChartData[] = [];
    const compositionData: CompositionChartData[] = [];

    soilData.forEach(item => {
        // Ensure item.date is a Timestamp before proceeding
       if (!item.date || !(item.date instanceof Timestamp)) {
         return; // Skip invalid data
       }

      const itemDate = item.date.toDate();
      // Double check if the date is valid after conversion
      if (!isValid(itemDate)) {
          console.warn("Skipping item with invalid date for chart:", item.id, item.date);
          return;
      }

      const dateStr = format(itemDate, 'MMM d, yy');

      if (item.measurementType === 'vess' && item.vessScore !== undefined && item.vessScore !== null) {
        vessData.push({ date: dateStr, vessScore: item.vessScore });
      } else if (item.measurementType === 'composition') {
         // Use calculated percentages if available, otherwise fall back to raw cm values if needed (though % is preferred)
         const sandValue = item.sandPercent ?? item.sand ?? null;
         const clayValue = item.clayPercent ?? item.clay ?? null;
         const siltValue = item.siltPercent ?? item.silt ?? null;

          // Only add if at least one value is present
          if (sandValue !== null || clayValue !== null || siltValue !== null) {
            compositionData.push({
              date: dateStr,
              sandPercent: sandValue,
              clayPercent: clayValue,
              siltPercent: siltValue,
            });
          }
      }
    });

    // Create maps to group data by date (taking the last entry for simplicity)
    const vessMap = new Map<string, VessChartData>();
    vessData.forEach(item => vessMap.set(item.date, item));

    const compositionMap = new Map<string, CompositionChartData>();
    compositionData.forEach(item => compositionMap.set(item.date, item));

    // Convert maps back to arrays, implicitly sorted by date due to insertion order from query
    const uniqueVessData = Array.from(vessMap.values());
    const uniqueCompositionData = Array.from(compositionMap.values());


    return { vessChartData: uniqueVessData, compositionChartData: uniqueCompositionData };
  }, [soilData]);

  if (isLoading) {
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

  const hasVessData = vessChartData.length > 1; // Need at least 2 points for a line/area chart
  const hasCompositionData = compositionChartData.length > 1;

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
              <AreaChart data={vessChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                 <YAxis domain={[0, 5]} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} ticks={[1, 2, 3, 4, 5]} width={30}/>
                 <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                 <Area
                  dataKey="vessScore"
                  type="monotone"
                  fill="var(--color-vessScore)"
                  fillOpacity={0.3}
                  stroke="var(--color-vessScore)"
                  stackId="a" // Use stackId if you plan to stack areas later
                  connectNulls // Connect lines even if there are missing data points
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-10">
               {soilData.filter(d => d.measurementType === 'vess').length <= 1 ? "Need at least two VESS score entries to display a trend." : "No VESS score data available."}
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
                 siltPercent: { label: "Silt", color: "hsl(var(--chart-1))" }, // Green (adjusted maybe?)
              }} className="h-[300px] w-full">
               <AreaChart data={compositionChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} stackOffset="expand"> {/* expand makes it a 100% chart */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                 {/* Y axis represents percentage 0-1 when stackOffset="expand" */}
                 <YAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                 <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(value, name) => `${(value * 100).toFixed(0)}%`} />} />
                 <ChartLegend content={<ChartLegendContent />} />
                 <Area
                   dataKey="sandPercent"
                   type="monotone"
                   fill="var(--color-sandPercent)"
                   fillOpacity={0.6} // Slightly more opaque for stacked
                   stroke="var(--color-sandPercent)"
                   stackId="composition"
                   connectNulls
                   // Convert raw numbers to proportion if needed, though expand handles it
                   // valueAccessor={(entry) => entry.sandPercent / 100}
                 />
                 <Area
                   dataKey="clayPercent"
                   type="monotone"
                   fill="var(--color-clayPercent)"
                   fillOpacity={0.6}
                   stroke="var(--color-clayPercent)"
                   stackId="composition"
                   connectNulls
                    // valueAccessor={(entry) => entry.clayPercent / 100}
                 />
                 <Area
                   dataKey="siltPercent"
                   type="monotone"
                   fill="var(--color-siltPercent)"
                    fillOpacity={0.6}
                   stroke="var(--color-siltPercent)"
                   stackId="composition"
                   connectNulls
                   // valueAccessor={(entry) => entry.siltPercent / 100}
                 />
              </AreaChart>
            </ChartContainer>
           ) : (
             <p className="text-muted-foreground text-center py-10">
               {soilData.filter(d => d.measurementType === 'composition').length <= 1 ? "Need at least two composition entries to display a trend." : "No soil composition data available."}
             </p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

    