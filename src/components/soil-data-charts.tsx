'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { SoilData } from '@/types/soil';
import { format } from 'date-fns';
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

    const q = query(
      collection(db, `users/${user.uid}/soilData`),
      orderBy('date', 'asc') // Order by date ascending for charts
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as SoilData & { id: string });
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
      const dateStr = format(item.date.toDate(), 'MMM d, yy');
      if (item.measurementType === 'vess' && item.vessScore !== undefined) {
        vessData.push({ date: dateStr, vessScore: item.vessScore });
      } else if (item.measurementType === 'composition') {
         compositionData.push({
          date: dateStr,
          sandPercent: item.sandPercent ?? null,
          clayPercent: item.clayPercent ?? null,
          siltPercent: item.siltPercent ?? null,
        });
      }
    });
    // Ensure unique dates if multiple entries on same day (take last one for simplicity)
    // This might need adjustment based on desired behavior (e.g., average)
     const uniqueVessData = Array.from(new Map(vessData.map(item => [item.date, item])).values());
     const uniqueCompositionData = Array.from(new Map(compositionData.map(item => [item.date, item])).values());

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
      <div className="text-destructive flex items-center gap-2">
        <AlertTriangle /> {error}
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
                vessScore: { label: "VESS Score", color: "hsl(var(--chart-1))" },
              }} className="h-[300px] w-full">
              <AreaChart data={vessChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                 <YAxis domain={[0, 5]} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} ticks={[1, 2, 3, 4, 5]} />
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
               {vessChartData.length <= 1 ? "Need at least two VESS score entries to display a trend." : "No VESS score data available."}
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
                sandPercent: { label: "Sand (%)", color: "hsl(var(--chart-3))" }, // Ochre/Yellow
                clayPercent: { label: "Clay (%)", color: "hsl(var(--chart-2))" }, // Brown
                siltPercent: { label: "Silt (%)", color: "hsl(var(--chart-1))" }, // Green
              }} className="h-[300px] w-full">
               <AreaChart data={compositionChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                 <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tickMargin={8} />
                 <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                 <ChartLegend content={<ChartLegendContent />} />
                 <Area
                  dataKey="sandPercent"
                  type="monotone"
                  fill="var(--color-sandPercent)"
                  fillOpacity={0.4}
                  stroke="var(--color-sandPercent)"
                  stackId="composition" // Stack the areas
                  connectNulls
                />
                 <Area
                  dataKey="clayPercent"
                  type="monotone"
                  fill="var(--color-clayPercent)"
                  fillOpacity={0.4}
                  stroke="var(--color-clayPercent)"
                  stackId="composition"
                  connectNulls
                />
                 <Area
                  dataKey="siltPercent"
                  type="monotone"
                  fill="var(--color-siltPercent)"
                  fillOpacity={0.4}
                  stroke="var(--color-siltPercent)"
                  stackId="composition"
                  connectNulls
                />
              </AreaChart>
            </ChartContainer>
           ) : (
             <p className="text-muted-foreground text-center py-10">
               {compositionChartData.length <= 1 ? "Need at least two composition entries to display a trend." : "No soil composition data available."}
             </p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

