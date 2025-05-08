
'use client';

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SoilData } from '@/types/soil';
import { cn } from '@/lib/utils';

interface RadarChartDataPoint {
  subject: string;
  locationValue: number | null; 
  averageValue: number | null; 
  fullMark: number; // Max value for this axis on the radar chart (will be 100 for all after normalization)
  // Raw values stored for tooltip display
  rawLocationValue: number | null;
  rawAverageValue: number | null;
  originalFullMark: number; // Store original fullMark for tooltip context if needed
}

export type LocationDataType = SoilData & { id: string; tawPercent?: number | null };

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

export function RadarChartComparison({
  locationData,
  countryAverageData,
  locationName = "Your Location",
  countryName = "Country Average"
}: RadarChartComparisonProps) {

  if (!countryAverageData && !locationData) { 
    return (
      <Card className="bg-card shadow-lg border-border rounded-lg">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Select your location and a country to see the comparison.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center py-10">
            Please select your location and a country to compare data.
          </p>
        </CardContent>
      </Card>
    );
  }
  
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

  const radarSubjects = [
    { subject: 'VESS Score', key: 'vessScore', fullMark: 5 },
    { subject: 'Sand %', key: 'sandPercent', fullMark: 100 },
    { subject: 'Clay %', key: 'clayPercent', fullMark: 100 },
    { subject: 'Silt %', key: 'siltPercent', fullMark: 100 },
    { subject: 'TAW %', key: 'tawPercent', fullMark: 50 }, 
  ];

  const chartData: RadarChartDataPoint[] = radarSubjects.map(item => {
    const locRawValue = preparedLocationMetrics ? preparedLocationMetrics[item.key as keyof typeof preparedLocationMetrics] : null;
    const countryRawValue = countryAverageData ? countryAverageData[item.key as keyof typeof countryAverageData] : null;

    const normalize = (value: number | null, originalFullMark: number): number | null => {
      if (value === null || value === undefined) return null;
      if (originalFullMark === 0) return 0; 
      return (value / originalFullMark) * 100;
    };

    const normalizedLocationValue = normalize(locRawValue, item.fullMark);
    const normalizedAverageValue = normalize(countryRawValue, item.fullMark);

    return {
      subject: item.subject,
      locationValue: normalizedLocationValue ?? 0, 
      averageValue: normalizedAverageValue ?? 0,   
      fullMark: 100, 
      rawLocationValue: locRawValue, 
      rawAverageValue: countryRawValue,
      originalFullMark: item.fullMark, 
    };
  }).filter(item => item.rawLocationValue !== null || item.rawAverageValue !== null); 


  if (chartData.length === 0) {
    return (
      <Card className="bg-card shadow-lg border-border rounded-lg">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Comparing {locationData ? locationName : 'N/A'} with {countryAverageData ? countryName : 'N/A'}.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
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

    if (locVal === null || countryVal === null) return null; 
    
    const difference = locVal - countryVal;
    const percentageDifference = countryVal !== 0 ? (difference / countryVal) * 100 : (difference > 0 ? Infinity : (difference < 0 ? -Infinity : 0));
    
    let comparisonTextSimple = "Similar";
    let isAbove = false;
    let isBelow = false;

    if (percentageDifference > 10) {
        comparisonTextSimple = `${Math.abs(percentageDifference).toFixed(0)}% Higher`;
        isAbove = true;
    } else if (percentageDifference < -10) {
        comparisonTextSimple = `${Math.abs(percentageDifference).toFixed(0)}% Lower`;
        isBelow = true;
    } else if (percentageDifference === Infinity) {
        comparisonTextSimple = `Much Higher`;
        isAbove = true;
    } else if (percentageDifference === -Infinity) {
        comparisonTextSimple = `Much Lower`;
        isBelow = true;
    } else if (difference > 0 && countryVal === 0) {
        comparisonTextSimple = `Higher`;
        isAbove = true;
    } else if (difference < 0 && countryVal === 0) { // Should not happen with VESS/percentages
        comparisonTextSimple = `Lower`;
        isBelow = true;
    }

    const decimals = item.key === 'vessScore' ? 1 : (item.key === 'tawPercent' ? 1 : 0);
    const unit = item.key === 'vessScore' ? '' : '%';
    const locationDisplayVal = locVal.toFixed(decimals);
    const countryDisplayVal = countryVal.toFixed(decimals);

    return {
      subject: item.subject,
      locationValueFormatted: `${locationDisplayVal}${unit}`,
      averageValueFormatted: `${countryDisplayVal}${unit}`,
      comparisonTextSimple,
      isAbove,
      isBelow
    };
  }).filter(Boolean);


  return (
    <div className="space-y-6">
      <Card className="bg-card shadow-lg border-border rounded-lg">
        <CardHeader>
          <CardTitle>Soil Data Comparison: {locationName} vs. {countryName}</CardTitle>
          <CardDescription>
            Visual comparison of key soil health indicators.
            {!locationData && <span className="block text-xs text-muted-foreground italic"> (No data for "{locationName}" to display on chart)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              
              {preparedLocationMetrics && (
                <Radar 
                  name={locationName} 
                  dataKey="locationValue" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.5} 
                />
              )}
              
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
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: number, name: string, entry) => { 
                    const { rawLocationValue, rawAverageValue, subject, originalFullMark } = entry.payload as RadarChartDataPoint;
                    const decimals = subject === 'VESS Score' ? 1 : (entry.payload.subject === 'TAW %' ? 1: 0);
                    
                    let displayValue: number | null = null;
                    if (name === locationName) {
                        displayValue = rawLocationValue;
                    } else if (name === countryName) {
                        displayValue = rawAverageValue;
                    }

                    const valueSuffix = subject === 'VESS Score' ? ` / ${originalFullMark}` : '%';

                    return displayValue !== null && displayValue !== undefined 
                        ? [`${displayValue.toFixed(decimals)}${valueSuffix}`, name] 
                        : [`N/A`, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {preparedLocationMetrics && countryAverageData && summaryItems.length > 0 && (
        <Card className="bg-card shadow-lg border-border rounded-lg">
            <CardHeader>
                <CardTitle>Comparison Summary</CardTitle>
                <CardDescription>How {locationName}'s soil data compares to {countryName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                {summaryItems.map(item => item && (
                    <div key={item.subject} className="text-sm p-3 border border-border rounded-md bg-background hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-card-foreground">{item.subject}</span>
                            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full",
                                item.isAbove ? "bg-primary/10 text-primary" : 
                                item.isBelow ? "bg-destructive/10 text-destructive" : 
                                "bg-muted text-muted-foreground"
                            )}>
                                {item.comparisonTextSimple}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between">
                            <span>{locationName}: <span className="font-medium text-foreground">{item.locationValueFormatted}</span></span>
                            <span className="hidden sm:inline mx-1.5">&bull;</span>
                            <span>{countryName}: <span className="font-medium text-foreground">{item.averageValueFormatted}</span></span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}
       {((!preparedLocationMetrics || !countryAverageData) || summaryItems.length === 0) && (
         <p className="text-muted-foreground text-center text-sm mt-4 p-4">
           {(!preparedLocationMetrics && countryAverageData) ? `Select one of your locations to compare its data against ${countryName}.` : 
           (preparedLocationMetrics && !countryAverageData) ? `Select a country to compare ${locationName} against.` :
           "Not enough overlapping data points for a detailed summary."}
         </p>
       )}
    </div>
  );
}

