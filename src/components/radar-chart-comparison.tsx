
'use client';

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SoilData } from '@/types/soil';
import { calculateSoilProperties } from '@/lib/soil-calculations';

interface RadarChartDataPoint {
  subject: string;
  locationValue: number | null;
  averageValue: number | null;
  fullMark: number;
}

// Define a more specific type for locationData prop
// It should be a SoilData object, with an optional, pre-calculated tawPercent
export type LocationDataType = SoilData & { id: string; tawPercent?: number | null };


interface RadarChartComparisonProps {
  locationData: LocationDataType | null; // User's specific location data
  countryAverageData: { // Simulated country average data
    vessScore: number | null;
    sandPercent: number | null;
    clayPercent: number | null;
    siltPercent: number | null;
    tawPercent: number | null;
  } | null;
  locationName?: string;
  countryName?: string;
}

const normalizeValue = (value: number | null | undefined, max: number): number | null => {
  if (value === null || value === undefined || isNaN(value)) return null;
  // Values are actual scores/percentages, fullMark in chartData defines axis scale
  return Math.max(0, Math.min(value, max)); 
};

export function RadarChartComparison({
  locationData,
  countryAverageData,
  locationName = "Your Location",
  countryName = "Country Average"
}: RadarChartComparisonProps) {

  // If either essential data is missing, show placeholder
  if (!countryAverageData) { // locationData can be null if no data for selected user location
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Select your location and a country to see the comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Please select a country to compare data. If a location is selected, its data will also be shown.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Prepare final location data, calculating TAW if necessary
  // This ensures finalLocationDataForChart always has the structure including tawPercent if applicable
  let finalLocationDataForChart: LocationDataType | null = null;
  if (locationData) {
    finalLocationDataForChart = { ...locationData }; // Clone to avoid mutating prop
    if (
        finalLocationDataForChart.measurementType === 'composition' &&
        finalLocationDataForChart.tawPercent === undefined && // Only calculate if not already provided
        finalLocationDataForChart.clayPercent != null &&
        finalLocationDataForChart.sandPercent != null
    ) {
        const properties = calculateSoilProperties(finalLocationDataForChart.clayPercent, finalLocationDataForChart.sandPercent);
        if (properties) {
            finalLocationDataForChart.tawPercent = properties.availableWater;
        }
    }
  }


  const chartData: RadarChartDataPoint[] = [
    {
      subject: 'VESS Score',
      locationValue: finalLocationDataForChart ? normalizeValue(finalLocationDataForChart.vessScore, 5) : null,
      averageValue: normalizeValue(countryAverageData.vessScore, 5),
      fullMark: 5,
    },
    {
      subject: 'Sand %',
      locationValue: finalLocationDataForChart ? normalizeValue(finalLocationDataForChart.sandPercent, 100) : null,
      averageValue: normalizeValue(countryAverageData.sandPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Clay %',
      locationValue: finalLocationDataForChart ? normalizeValue(finalLocationDataForChart.clayPercent, 100) : null,
      averageValue: normalizeValue(countryAverageData.clayPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Silt %',
      locationValue: finalLocationDataForChart ? normalizeValue(finalLocationDataForChart.siltPercent, 100) : null,
      averageValue: normalizeValue(countryAverageData.siltPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'TAW %', // Total Available Water
      locationValue: finalLocationDataForChart ? normalizeValue(finalLocationDataForChart.tawPercent, 50) : null, // Max TAW e.g. 50%
      averageValue: normalizeValue(countryAverageData.tawPercent, 50),
      fullMark: 50, // Set a reasonable max for TAW percentage for the axis scale
    },
  ].filter(item => item.locationValue !== null || item.averageValue !== null); // Keep if at least one value exists


  if (chartData.length === 0) {
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Comparing {locationName} with {countryName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Insufficient data for comparison. Ensure VESS score or composition percentages are available.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const summaryItems = chartData.map(item => {
    if (item.locationValue === null || item.averageValue === null) return null; // Only summarize if both values exist
    const difference = item.locationValue - item.averageValue;
    const percentageDifference = item.averageValue !== 0 ? (difference / item.averageValue) * 100 : (difference > 0 ? 100 : (difference < 0 ? -100 : 0));
    
    let comparisonText = "similar to average";
    if (percentageDifference > 10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% above average`;
    else if (percentageDifference < -10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% below average`;
    
    const unit = item.subject === 'VESS Score' ? '' : '%'; // VESS is a score, others are %
    return {
      subject: item.subject,
      locationValueFormatted: item.locationValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      averageValueFormatted: item.averageValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      comparisonText
    };
  }).filter(Boolean);


  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison: {locationData ? locationName : 'N/A'} vs. {countryName}</CardTitle>
          <CardDescription>
            Visual comparison of key soil health indicators.
            {!locationData && <span className="block text-xs text-muted-foreground italic"> (No data for "{locationName}" to display on chart)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              
              {/* Radar for User's Location Data */}
              {locationData && ( // Only render this Radar if locationData is present
                <Radar 
                  name={locationName} 
                  dataKey="locationValue" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.5} 
                />
              )}
              
              {/* Radar for Country Average Data */}
              <Radar 
                name={countryName} 
                dataKey="averageValue" 
                stroke="hsl(var(--chart-2))" 
                fill="hsl(var(--chart-2))" 
                fillOpacity={0.5} 
              />
              
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, entry) => {
                    // entry.payload.subject refers to the metric (VESS Score, Sand %, etc.)
                    const unit = entry.payload.subject === 'VESS Score' ? '' : '%';
                    // Value can be null if dataKey for a series is missing for that subject
                    return value !== null ? [`${value?.toFixed(1)}${unit}`, name] : [null, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {locationData && summaryItems.length > 0 && ( // Only show summary if location data and comparable items exist
        <Card>
            <CardHeader>
                <CardTitle>Comparison Summary</CardTitle>
                <CardDescription>How {locationName}'s soil data compares to the national average for {countryName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {summaryItems.map(item => item && ( // item is already filtered for Boolean
                    <div key={item.subject} className="text-sm p-2 border-b border-border last:border-b-0">
                        <span className="font-semibold">{item.subject}:</span> Your location is {item.comparisonText}.
                        <span className="text-xs text-muted-foreground"> (Your: {item.locationValueFormatted}, Avg: {item.averageValueFormatted})</span>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}
       {locationData && summaryItems.length === 0 && (
         <p className="text-muted-foreground text-center text-sm">Not enough overlapping data points for a detailed summary between your location and the country average.</p>
       )}
    </div>
  );
}

