
'use client';

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SoilData } from '@/types/soil'; // Assuming SoilData might have tawPercent
import { calculateSoilProperties } from '@/lib/soil-calculations';

interface RadarChartDataPoint {
  subject: string;
  locationValue: number | null;
  averageValue: number | null;
  fullMark: number;
}

// Define a more specific type for locationData prop if needed
type LocationDataType = SoilData & { tawPercent?: number | null };

interface RadarChartComparisonProps {
  locationData: LocationDataType | null;
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

const normalizeValue = (value: number | null | undefined, max: number): number | null => {
  if (value === null || value === undefined || isNaN(value)) return null;
  return Math.max(0, Math.min(value, max));
};

export function RadarChartComparison({
  locationData,
  countryAverageData,
  locationName = "Your Location",
  countryName = "Country Average"
}: RadarChartComparisonProps) {

  if (!locationData || !countryAverageData) {
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Select your location and a country to see the comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Please select a location and a country to compare data.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate TAW for locationData if not already present and it's composition type
  let finalLocationData = { ...locationData };
  if (locationData.measurementType === 'composition' && 
      locationData.tawPercent === undefined && // Check if TAW is not already calculated
      locationData.clayPercent != null && 
      locationData.sandPercent != null) {
    const properties = calculateSoilProperties(locationData.clayPercent, locationData.sandPercent);
    if (properties) {
      finalLocationData.tawPercent = properties.availableWater;
    }
  }


  const chartData: RadarChartDataPoint[] = [
    {
      subject: 'VESS Score',
      locationValue: normalizeValue(finalLocationData.vessScore, 5),
      averageValue: normalizeValue(countryAverageData.vessScore, 5),
      fullMark: 5,
    },
    {
      subject: 'Sand %',
      locationValue: normalizeValue(finalLocationData.sandPercent, 100),
      averageValue: normalizeValue(countryAverageData.sandPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Clay %',
      locationValue: normalizeValue(finalLocationData.clayPercent, 100),
      averageValue: normalizeValue(countryAverageData.clayPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Silt %',
      locationValue: normalizeValue(finalLocationData.siltPercent, 100),
      averageValue: normalizeValue(countryAverageData.siltPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'TAW %',
      locationValue: normalizeValue(finalLocationData.tawPercent, 50), // Max TAW e.g. 50%
      averageValue: normalizeValue(countryAverageData.tawPercent, 50),
      fullMark: 50,
    },
  ].filter(item => item.locationValue !== null || item.averageValue !== null) as RadarChartDataPoint[];


  if (chartData.length === 0) {
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Comparing {locationName} with {countryName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Insufficient data for comparison. Ensure VESS score or composition percentages are available for your location.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const summaryItems = chartData.map(item => {
    if (item.locationValue === null || item.averageValue === null) return null;
    const difference = item.locationValue - item.averageValue;
    const percentageDifference = item.averageValue !== 0 ? (difference / item.averageValue) * 100 : (difference > 0 ? 100 : (difference < 0 ? -100 : 0));
    let comparisonText = "similar to average";
    if (percentageDifference > 10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% above average`; // Adjusted threshold
    else if (percentageDifference < -10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% below average`; // Adjusted threshold
    
    const unit = item.subject === 'VESS Score' ? '' : '%';
    return {
      subject: item.subject,
      locationValue: item.locationValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      averageValue: item.averageValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
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
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar name={locationName} dataKey="locationValue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.5} />
              <Radar name={countryName} dataKey="averageValue" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.5} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, entry) => {
                    const unit = entry.payload.subject === 'VESS Score' ? '' : '%';
                    return [`${value?.toFixed(1)}${unit}`, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Comparison Summary</CardTitle>
            <CardDescription>How {locationName}'s soil data compares to the national average for {countryName}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            {summaryItems.length > 0 ? summaryItems.map(item => item && (
                <div key={item.subject} className="text-sm p-2 border-b border-border last:border-b-0">
                    <span className="font-semibold">{item.subject}:</span> Your location is {item.comparisonText}.
                    <span className="text-xs text-muted-foreground"> (Your: {item.locationValue}, Avg: {item.averageValue})</span>
                </div>
            )) : (
                <p className="text-muted-foreground">Not enough data for a detailed summary.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
