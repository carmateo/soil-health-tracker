'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import type { SoilData } from '@/types/soil';
import { calculateSoilProperties } from '@/lib/soil-calculations';
import { format, isValid } from 'date-fns';
import { getLocationKeyAndName } from '@/lib/location-utils'; // Import helper

// Define chart data type
interface PedotransferChartData {
  date: string; // Formatted date string for XAxis
  availableWater: number | null; // AW (%)
  originalDate: Date; // Store original date for sorting and reference
  id: string; // Original entry ID for key/reference
}

// Helper function to check if a value is a valid number
const isValidNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);

interface PedotransferAnalysisChartProps {
  data: Array<SoilData & { id: string }>;
  locationName?: string; // Optional prop to display location name in title
}

export function PedotransferAnalysisChart({ data, locationName }: PedotransferAnalysisChartProps) {

  const soilData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const pedotransferChartData = useMemo(() => {
    const ptfData: PedotransferChartData[] = [];
    console.log("PedotransferAnalysisChart: Generating chart data from props:", soilData);

    // Sort data by date ascending for chart consistency
    const sortedData = [...soilData].sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

    sortedData.forEach(item => {
      // Ensure it's composition data with valid date and percentages
      if (
        item.measurementType === 'composition' &&
        item.date && isValid(item.date.toDate()) &&
        isValidNumber(item.clayPercent) && item.clayPercent >= 0 && item.clayPercent <= 100 &&
        isValidNumber(item.sandPercent) && item.sandPercent >= 0 && item.sandPercent <= 100
      ) {
        const itemDate = item.date.toDate();
        const dateStr = format(itemDate, 'MMM d, yy');

        // Calculate properties
        const properties = calculateSoilProperties(item.clayPercent, item.sandPercent);

        if (properties && isValidNumber(properties.availableWater)) {
          ptfData.push({
            id: item.id,
            date: dateStr,
            availableWater: properties.availableWater,
            originalDate: itemDate
          });
        } else {
           console.warn(`PedotransferAnalysisChart: Skipping item ${item.id} due to invalid calculation results.`);
        }
      } else if (item.measurementType === 'composition') {
          console.warn(`PedotransferAnalysisChart: Skipping item ${item.id} due to missing/invalid date or percentages for calculation.`);
      }
    });

    console.log("PedotransferAnalysisChart: Generated PTF Chart Data:", ptfData);
    return ptfData;
  }, [soilData]);

  const hasPtfData = pedotransferChartData.length > 0;
  const needsMorePtfData = pedotransferChartData.length < 1; // Bar chart only needs 1 bar

  const chartTitle = locationName ? `Pedotransfer Analysis for: ${locationName}` : 'Pedotransfer Analysis';

  if (soilData.length === 0 && !locationName) { // Only show "no data available" if no location context either
     return (
        <Card className="bg-card shadow-md border-border">
            <CardHeader>
                <CardTitle>{chartTitle}</CardTitle>
                 <CardDescription>Estimated Available Water (%) based on Soil Composition</CardDescription>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground text-center py-10">
                    No soil data available for analysis.
                 </p>
            </CardContent>
        </Card>
     )
  }

  return (
    <Card className="bg-card shadow-md border-border">
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>Estimated Available Water (%) based on Soil Composition</CardDescription>
      </CardHeader>
      <CardContent>
        {hasPtfData ? (
          <ChartContainer config={{
              availableWater: { label: "Available Water (%)", color: "hsl(var(--chart-4))" }, // Use a different chart color (e.g., blue)
            }} className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={pedotransferChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    interval="preserveStartEnd" // Show first and last tick
                    // Consider rotating labels if many entries: angle={-45} textAnchor="end" height={50}
                  />
                <YAxis
                    label={{ value: 'Available Water (%)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fontSize: '12px', fill: 'hsl(var(--muted-foreground))' } }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    width={50} // Adjust width to fit label
                  />
                <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => [`${value}%`, "Available Water"]} />}
                    cursor={{ fill: 'hsl(var(--accent)/0.3)' }} // Highlight bar on hover
                  />
                <Bar
                  dataKey="availableWater"
                  fill="var(--color-availableWater)"
                  radius={[4, 4, 0, 0]} // Rounded top corners
                  barSize={pedotransferChartData.length > 10 ? 20 : 40} // Adjust bar size based on data points
                >
                    {/* Optional: Add labels on top of bars */}
                    <LabelList dataKey="availableWater" position="top" formatter={(value: number) => `${value}%`} fontSize={10} fill="hsl(var(--foreground))" offset={5}/>
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <p className="text-muted-foreground text-center py-10">
              No soil composition data with valid Sand and Clay percentages found to calculate Available Water{locationName ? ` for ${locationName}` : ''}.
          </p>
        )}
         {hasPtfData && needsMorePtfData && (
            <p className="text-xs text-muted-foreground text-center mt-2">
               Add soil composition entries with Sand and Clay % to see the analysis.
             </p>
         )}
      </CardContent>
    </Card>
  );
}
