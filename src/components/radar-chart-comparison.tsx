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

  if (!countryAverageData) {
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
  
  // Prepare a structure that definitively holds the values for the location based on its type
  let preparedLocationMetrics: {
    vessScore: number | null;
    sandPercent: number | null;
    clayPercent: number | null;
    siltPercent: number | null;
    tawPercent: number | null;
  } | null = null;

  if (locationData) {
    if (locationData.measurementType === 'vess') {
      preparedLocationMetrics = {
        vessScore: locationData.vessScore ?? null,
        sandPercent: null,
        clayPercent: null,
        siltPercent: null,
        tawPercent: null,
      };
    } else if (locationData.measurementType === 'composition') {
      // TAW should already be on locationData if calculable, as per LocationComparisonView logic
      preparedLocationMetrics = {
        vessScore: null, // VESS score is null for composition type
        sandPercent: locationData.sandPercent ?? null,
        clayPercent: locationData.clayPercent ?? null,
        siltPercent: locationData.siltPercent ?? null,
        tawPercent: locationData.tawPercent !== undefined ? locationData.tawPercent : null, // Use pre-calculated TAW or null
      };
    }
  }

  const rawChartPoints = [
    {
      subject: 'VESS Score',
      locationVal: preparedLocationMetrics ? normalizeValue(preparedLocationMetrics.vessScore, 5) : null,
      averageVal: countryAverageData ? normalizeValue(countryAverageData.vessScore, 5) : null,
      fullMark: 5,
    },
    {
      subject: 'Sand %',
      locationVal: preparedLocationMetrics ? normalizeValue(preparedLocationMetrics.sandPercent, 100) : null,
      averageVal: countryAverageData ? normalizeValue(countryAverageData.sandPercent, 100) : null,
      fullMark: 100,
    },
    {
      subject: 'Clay %',
      locationVal: preparedLocationMetrics ? normalizeValue(preparedLocationMetrics.clayPercent, 100) : null,
      averageVal: countryAverageData ? normalizeValue(countryAverageData.clayPercent, 100) : null,
      fullMark: 100,
    },
    {
      subject: 'Silt %',
      locationVal: preparedLocationMetrics ? normalizeValue(preparedLocationMetrics.siltPercent, 100) : null,
      averageVal: countryAverageData ? normalizeValue(countryAverageData.siltPercent, 100) : null,
      fullMark: 100,
    },
    {
      subject: 'TAW %',
      locationVal: preparedLocationMetrics ? normalizeValue(preparedLocationMetrics.tawPercent, 50) : null,
      averageVal: countryAverageData ? normalizeValue(countryAverageData.tawPercent, 50) : null,
      fullMark: 50,
    },
  ];

  const chartData: RadarChartDataPoint[] = rawChartPoints
    .filter(item => item.locationVal !== null || item.averageVal !== null)
    .map(item => ({
        subject: item.subject,
        locationValue: locationData ? (item.locationVal ?? 0) : null, 
        averageValue: item.averageVal ?? 0,
        fullMark: item.fullMark,
    }));


  if (chartData.length === 0) {
    return (
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Soil Data Comparison</CardTitle>
          <CardDescription>Comparing {locationData ? locationName : 'N/A'} with {countryName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">
            Insufficient data for comparison. Ensure VESS score or composition percentages are available.
            {!locationData && countryAverageData && <span> Country average data is available.</span>}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const summaryItems = chartData.map(item => {
    const originalLocationPoint = rawChartPoints.find(p => p.subject === item.subject);
    if (!originalLocationPoint || originalLocationPoint.locationVal === null || originalLocationPoint.averageVal === null) return null;
    
    const difference = originalLocationPoint.locationVal - originalLocationPoint.averageVal;
    const percentageDifference = originalLocationPoint.averageVal !== 0 ? (difference / originalLocationPoint.averageVal) * 100 : (difference > 0 ? 100 : (difference < 0 ? -100 : 0));
    
    let comparisonText = "similar to average";
    if (percentageDifference > 10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% above average`;
    else if (percentageDifference < -10) comparisonText = `${Math.abs(percentageDifference).toFixed(0)}% below average`;
    
    const unit = item.subject === 'VESS Score' ? '' : '%';
    return {
      subject: item.subject,
      locationValueFormatted: originalLocationPoint.locationVal.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
      averageValueFormatted: originalLocationPoint.averageVal.toFixed(item.subject === 'VESS Score' ? 1 : 0) + unit,
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
                    const unit = entry.payload.subject === 'VESS Score' ? '' : '%';
                    const rawPoint = rawChartPoints.find(p => p.subject === entry.payload.subject);
                    let displayValue: number | null = value; // Fallback to the value Recharts provides
                    
                    if (rawPoint) { // Check if rawPoint exists
                        if (name === locationName) {
                            displayValue = rawPoint.locationVal;
                        } else if (name === countryName) {
                            displayValue = rawPoint.averageVal;
                        }
                    }

                    return displayValue !== null && displayValue !== undefined ? [`${displayValue.toFixed(entry.payload.subject === 'VESS Score' ? 1:0)}${unit}`, name] : [`N/A`, name];
                }}
               />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {preparedLocationMetrics && summaryItems.length > 0 && (
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
       {preparedLocationMetrics && summaryItems.length === 0 && (
         <p className="text-muted-foreground text-center text-sm">Not enough overlapping data points for a detailed summary between your location and the country average.</p>
       )}
       {!preparedLocationMetrics && countryAverageData && (
            <p className="text-muted-foreground text-center text-sm mt-4">Select one of your locations to compare its data against {countryName}.</p>
       )}
    </div>
  );
}
