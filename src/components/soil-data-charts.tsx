'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { SoilData } from '@/types/soil';
import { format, isValid } from 'date-fns';
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

interface SoilDataChartsProps {
  data: Array<SoilData & { id: string }>;
  locationName?: string; // Optional prop for context
}

export function SoilDataCharts({ data, locationName }: SoilDataChartsProps) {

  // Ensure data is always an array
  const soilData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const { vessChartData, compositionChartData } = useMemo(() => {
    const vessData: VessChartData[] = [];
    const compositionData: CompositionChartData[] = [];
    console.log("SoilDataCharts: Generating chart data from props:", soilData); // Log chart data generation

    // Sort data by date ascending for charts *before* processing
    const sortedData = [...soilData].sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

    sortedData.forEach(item => {
       // Date validation happens in Dashboard listener now
       if (!item.date || !isValid(item.date.toDate())) {
           console.warn(`SoilDataCharts: Skipping item ${item.id} in chart generation due to invalid date.`);
           return;
       }
       const itemDate = item.date.toDate();
       const dateStr = format(itemDate, 'MMM d, yy');

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
               console.warn(`SoilDataCharts: Skipping composition chart entry for ${item.id} due to missing/invalid percentage data.`);
           }
       }
    });

    // Data is already sorted by date
    console.log("SoilDataCharts: Generated VESS Chart Data:", vessData);
    console.log("SoilDataCharts: Generated Composition Chart Data:", compositionData);

    return { vessChartData: vessData, compositionChartData: compositionData };
  }, [soilData]); // Depend only on the prop data


  // Loading and error states are now handled by the parent Dashboard component.
  // We just need to check if there's data to display.

  const hasVessData = vessChartData.length > 0;
  const hasCompositionData = compositionChartData.length > 0;
  const needsMoreVessData = vessChartData.length < 2;
  const needsMoreCompositionData = compositionChartData.length < 2;

  // Check if *any* data was passed, even if it didn't result in chart data
  if (soilData.length === 0) {
     const message = locationName
        ? `No data available for ${locationName} to display charts.`
        : 'No data available to display charts. Add some soil entries first.';
     return (
        <p className="text-muted-foreground text-center py-10">
            {message}
        </p>
     )
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* VESS Score Chart */}
      <Card className="bg-card shadow-md border-border">
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
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
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
                No VESS score data available in the selected entries{locationName ? ` for ${locationName}` : ''}.
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
       <Card className="bg-card shadow-md border-border">
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                     <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} interval="preserveStartEnd"/>
                     {/* Y axis represents percentage 0-1 when stackOffset="expand" */}
                     <YAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tickLine={false} axisLine={false} tickMargin={8} width={40} />
                     <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => [`${(value * 100).toFixed(0)}%`, name]} />} cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1 }}/>
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
                No soil composition data (with percentages) available in the selected entries{locationName ? ` for ${locationName}` : ''}.
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
