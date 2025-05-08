
'use client';

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SoilData } from '@/types/soil';
// calculateSoilProperties is not directly used here anymore as TAW should be pre-calculated in locationData
// import { calculateSoilProperties } from '@/lib/soil-calculations'; 

interface RadarChartDataPoint {
  subject: string;
  locationValue: number | null; // Value for "Your Location", normalized or direct based on what's available
  averageValue: number | null; // Value for "Country Average"
  fullMark: number; // Max value for this axis on the radar chart
}

// LocationDataType represents the data structure expected for 'locationData' prop
// It's essentially SoilData with an id and an optional pre-calculated tawPercent
export type LocationDataType = SoilData & { id: string; tawPercent?: number | null };

interface RadarChartComparisonProps {
  locationData: LocationDataType | null; // This should now correctly reflect the latest entry (VESS or Comp)
  countryAverageData: {
    vessScore: number | null;
    sandPercent: number | null;
    clayPercent: number | null;
    siltPercent: number | null;
    tawPercent: number | null;
  } | null;
  locationName?: string;
  countryName?: string;
}

// Normalize values for the radar chart (0 to fullMark for display purposes on axis)
// However, for tooltips, we often want to show the raw value.
// The radar chart itself will scale based on domain [0, 'dataMax'] or specific fullMark per axis.
// For simplicity in data prep, we'll pass raw values and let Recharts handle scaling on axes.
// Tooltips will format raw values.
const normalizeValue = (value: number | null | undefined, max: number): number | null => {
  if (value === null || value === undefined || isNaN(value)) return null;
  // For radar display, we might not need to normalize to 0-100 if fullMark is used per axis.
  // Let's return the value as is, or 0 if it's negative, and capped at max.
  return Math.max(0, Math.min(value, max));
};

export function RadarChartComparison({
  locationData,
  countryAverageData,
  locationName = "Your Location",
  countryName = "Country Average"
}: RadarChartComparisonProps) {

  if (!countryAverageData && !locationData) { // Show placeholder if no data at all
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Select your location and a country to see the comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Please select your location and a country to compare data.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // `locationData` (from parent) should now correctly provide VESS or Composition values, with others as null.
  // So, `preparedLocationMetrics` can directly use these.
  let preparedLocationMetrics: {
    vessScore: number | null;
    sandPercent: number | null;
    clayPercent: number | null;
    siltPercent: number | null;
    tawPercent: number | null;
  } | null = null;

  if (locationData) {
    preparedLocationMetrics = {
      vessScore: locationData.vessScore ?? null,
      sandPercent: locationData.sandPercent ?? null,
      clayPercent: locationData.clayPercent ?? null,
      siltPercent: locationData.siltPercent ?? null,
      tawPercent: locationData.tawPercent !== undefined ? locationData.tawPercent : null,
    };
  }

  // Define subjects and their max values for the radar chart axes
  const radarSubjects = [
    { subject: 'VESS Score', key: 'vessScore', fullMark: 5 },
    { subject: 'Sand %', key: 'sandPercent', fullMark: 100 },
    { subject: 'Clay %', key: 'clayPercent', fullMark: 100 },
    { subject: 'Silt %', key: 'siltPercent', fullMark: 100 },
    { subject: 'TAW %', key: 'tawPercent', fullMark: 50 }, // Max TAW can be adjusted based on typical ranges
  ];

  const chartData: RadarChartDataPoint[] = radarSubjects.map(item => {
    // Get raw values for tooltip and direct comparison
    const locRawValue = preparedLocationMetrics ? preparedLocationMetrics[item.key as keyof typeof preparedLocationMetrics] : null;
    const countryRawValue = countryAverageData ? countryAverageData[item.key as keyof typeof countryAverageData] : null;

    // For radar chart display, use 0 if value is null, so line goes to center.
    // Tooltip will show "N/A" for nulls.
    return {
      subject: item.subject,
      locationValue: locRawValue ?? 0, // Use 0 for chart line if null
      averageValue: countryRawValue ?? 0, // Use 0 for chart line if null
      fullMark: item.fullMark,
      // Store raw values for tooltip
      rawLocationValue: locRawValue, 
      rawAverageValue: countryRawValue,
    };
  }).filter(item => item.rawLocationValue !== null || item.rawAverageValue !== null); // Only include if at least one value exists


  if (chartData.length === 0) {
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Comparing {locationData ? locationName : 'N/A'} with {countryAverageData ? countryName : 'N/A'}.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Insufficient data for comparison. Ensure VESS score or composition percentages are available for the selected location or country.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const summaryItems = radarSubjects.map(item => {
    const locVal = preparedLocationMetrics ? preparedLocationMetrics[item.key as keyof typeof preparedLocationMetrics] : null;
    const countryVal = countryAverageData ? countryAverageData[item.key as keyof typeof countryAverageData] : null;

    if (locVal === null || countryVal === null) return null; // Cannot compare if one is null
    
    const difference = locVal - countryVal;
    const percentageDifference = countryVal !== 0 ? (difference / countryVal) * 100 : (difference > 0 ? Infinity : (difference < 0 ? -Infinity : 0));
    
    let comparisonText = "similar to average";
    if (percentageDifference > 10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% above average`;
    else if (percentageDifference < -10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% below average`;
    else if (percentageDifference === Infinity) comparisonText = `significantly above average (avg was 0)`;
    else if (percentageDifference === -Infinity) comparisonText = `significantly below average (avg was 0)`;

    const unit = item.subject === 'VESS Score' ? '' : '%';
    return {
      subject: item.subject,
      locationValueFormatted: locVal.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      averageValueFormatted: countryVal.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      comparisonText
    };
  }).filter(Boolean);


  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison: {locationName} vs. {countryName}</CardTitle>
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
              {/* PolarRadiusAxis can be configured per-axis if `domain` on Radar component is used,
                  or globally if all axes share similar scale concepts. 
                  Here, we'll let Recharts determine based on dataMax or explicit fullMark if possible.
                  For simplicity, a generic radius axis is often fine. */}
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              
              {/* Render location radar only if locationData (and thus preparedLocationMetrics) is present */}
              {preparedLocationMetrics && (
                <Radar 
                  name={locationName} 
                  dataKey="locationValue" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.5} 
                />
              )}
              
               {/* Render country average radar only if countryAverageData is present */}
              {countryAverageData && (
                <Radar 
                  name={countryName} 
                  dataKey="averageValue" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.5} 
                />
              )}
              
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, entry) => {
                    // Access raw values from the payload for accurate tooltip display
                    const { rawLocationValue, rawAverageValue, subject } = entry.payload;
                    const unit = subject === 'VESS Score' ? '' : '%';
                    
                    let displayValue: number | null = null;
                    if (name === locationName) {
                        displayValue = rawLocationValue;
                    } else if (name === countryName) {
                        displayValue = rawAverageValue;
                    }

                    return displayValue !== null && displayValue !== undefined 
                        ? [`${displayValue.toFixed(subject === 'VESS Score' ? 1:0)}${unit}`, name] 
                        : [`N/A`, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {preparedLocationMetrics && countryAverageData && summaryItems.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Comparison Summary</CardTitle>
                <CardDescription>How {locationName}'s soil data compares to the national average for {countryName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {summaryItems.map(item => item && (
                    <div key={item.subject} className="text-sm p-2 border-b border-border last:border-b-0">
                        <span className="font-semibold">{item.subject}:</span> Your location is {item.comparisonText}.
                        <span className="text-xs text-muted-foreground"> (Your: {item.locationValueFormatted}, Avg: {item.averageValueFormatted})</span>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}
       {( (!preparedLocationMetrics || !countryAverageData) || summaryItems.length === 0) && (
         <p className="text-muted-foreground text-center text-sm mt-4">
           {(!preparedLocationMetrics && countryAverageData) ? `Select one of your locations to compare its data against ${countryName}.` : 
           (preparedLocationMetrics && !countryAverageData) ? `Select a country to compare ${locationName} against.` :
           "Not enough overlapping data points for a detailed summary."}
         </p>
       )}
    </div>
  );
}

