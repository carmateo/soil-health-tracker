
'use client';

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SoilData } from '@/types/soil';

interface RadarChartDataPoint {
  subject: string;
  locationValue: number | null;
  averageValue: number | null;
  fullMark: number;
}

interface RadarChartComparisonProps {
  locationData: SoilData | null; // Data for the user's selected location
  countryAverageData: { // Simulated or fetched national average data
    vessScore: number | null;
    sandPercent: number | null;
    clayPercent: number | null;
    siltPercent: number | null;
    tawPercent: number | null; // Total Available Water
  } | null;
  locationName?: string;
  countryName?: string;
}

const normalizeValue = (value: number | null | undefined, max: number): number | null => {
  if (value === null || value === undefined || isNaN(value)) return null;
  // Normalize to a scale of 0-100 for chart consistency, then the chart can scale it against fullMark
  // Or, ensure the value is within a sensible range if max is e.g. 5 for VESS.
  // For simplicity here, we'll assume values are already somewhat comparable or we use fullMark effectively.
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

  // Prepare data for the radar chart
  const chartData: RadarChartDataPoint[] = [
    {
      subject: 'VESS Score',
      locationValue: normalizeValue(locationData.vessScore, 5),
      averageValue: normalizeValue(countryAverageData.vessScore, 5),
      fullMark: 5,
    },
    {
      subject: 'Sand %',
      locationValue: normalizeValue(locationData.sandPercent, 100),
      averageValue: normalizeValue(countryAverageData.sandPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Clay %',
      locationValue: normalizeValue(locationData.clayPercent, 100),
      averageValue: normalizeValue(countryAverageData.clayPercent, 100),
      fullMark: 100,
    },
    {
      subject: 'Silt %',
      locationValue: normalizeValue(locationData.siltPercent, 100),
      averageValue: normalizeValue(countryAverageData.siltPercent, 100),
      fullMark: 100,
    },
    // Assuming TAW is available in locationData or calculated separately
    // For now, let's mock it or assume it's passed if available
    // If TAW is calculated, it should be done before this component
    {
      subject: 'TAW %',
      // This assumes `locationData` might have a `tawPercent` property if pre-calculated.
      // Otherwise, it would need to be calculated from sand/clay if those are available.
      // For this example, let's assume it might be null or a direct property.
      locationValue: normalizeValue(locationData.tawPercent, 50), // Max TAW can vary, e.g. 25-50%
      averageValue: normalizeValue(countryAverageData.tawPercent, 50),
      fullMark: 50, // Adjust fullMark based on expected TAW range
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
            Insufficient data for comparison. Ensure VESS score or composition percentages are available.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Summary Text
  const summaryItems = chartData.map(item => {
    if (item.locationValue === null || item.averageValue === null) return null;
    const difference = item.locationValue - item.averageValue;
    const percentageDifference = item.averageValue !== 0 ? (difference / item.averageValue) * 100 : (difference > 0 ? 100 : (difference < 0 ? -100 : 0));
    let comparisonText = "similar to average";
    if (percentageDifference > 5) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% above average`;
    else if (percentageDifference < -5) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% below average`;
    
    return {
      subject: item.subject,
      locationValue: item.locationValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + (item.subject.includes('%') || item.subject === 'VESS Score' ? '' : '%'),
      averageValue: item.averageValue.toFixed(item.subject === 'VESS Score' ? 1 : 0) + (item.subject.includes('%') || item.subject === 'VESS Score' ? '' : '%'),
      comparisonText
    };
  }).filter(Boolean);


  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison: {locationName} vs. {countryName}</CardTitle>
          <CardDescription>
            Visual comparison of key soil health indicators. Values are normalized for the chart.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Radar name={locationName} dataKey="locationValue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.5} />
              <Radar name={countryName} dataKey="averageValue" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.5} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, props) => {
                    const { payload } = props;
                    const fullMark = payload?.fullMark || 100;
                    // If value is normalized (0-1), convert back for tooltip if needed, or display as is
                    // For this setup, values are directly from data, capped at fullMark
                    return [`${value?.toFixed(1)}${payload?.subject.includes('%') || payload?.subject === 'VESS Score' ? (payload?.subject === 'VESS Score' ? '' : '%') : ''}`, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Comparison Summary</CardTitle>
            <CardDescription>How your location's soil data compares to the national average for {countryName}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            {summaryItems.length > 0 ? summaryItems.map(item => item && (
                <div key={item.subject} className="text-sm p-2 border-b border-border last:border-b-0">
                    <span className="font-semibold">{item.subject}:</span> {item.comparisonText}
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
