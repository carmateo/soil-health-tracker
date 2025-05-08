
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SoilData } from '@/types/soil';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';


interface WorldMapVisualizationProps {
  data: Array<SoilData & { id: string }>;
}

interface CountrySampleCounts {
  [countryName: string]: number;
}

// Simplified World Map SVG (Placeholder - replace with a proper one)
// For a real implementation, you'd use a detailed SVG with paths for each country,
// where each path has an ID or data-attribute matching country names/codes.
const WorldMapSVG = ({ countryCounts, onCountryHover, onCountryLeave }: {
  countryCounts: CountrySampleCounts;
  onCountryHover: (country: string, x: number, y: number) => void;
  onCountryLeave: () => void;
}) => {
  // This is a very simplified representation.
  // A real map would have complex <path> elements for each country.
  // The `id` or a `data-country` attribute on each path would be used.
  const countries = [
    // Example countries - replace with actual SVG paths
    { id: 'USA', name: 'United States', path: 'M100,100 h50 v30 h-50 z', color: 'hsl(var(--chart-1))' },
    { id: 'CAN', name: 'Canada', path: 'M100,50 h50 v30 h-50 z', color: 'hsl(var(--chart-2))' },
    { id: 'MEX', name: 'Mexico', path: 'M100,150 h50 v30 h-50 z', color: 'hsl(var(--chart-3))' },
    { id: 'BRA', name: 'Brazil', path: 'M200,200 h60 v50 h-60 z', color: 'hsl(var(--chart-4))' },
    { id: 'ARG', name: 'Argentina', path: 'M200,270 h50 v40 h-50 z', color: 'hsl(var(--chart-5))' },
    { id: 'GBR', name: 'United Kingdom', path: 'M300,80 h30 v20 h-30 z', color: 'hsl(var(--accent))' },
    { id: 'FRA', name: 'France', path: 'M350,90 h30 v25 h-30 z', color: 'hsl(var(--primary))' },
    { id: 'DEU', name: 'Germany', path: 'M380,70 h30 v20 h-30 z', color: 'hsl(var(--secondary-foreground))' },
    { id: 'AUS', name: 'Australia', path: 'M450,250 h80 v60 h-80 z', color: 'hsl(var(--chart-1))' },
    { id: 'CHN', name: 'China', path: 'M400,120 h70 v50 h-70 z', color: 'hsl(var(--chart-2))' },
    { id: 'IND', name: 'India', path: 'M350,150 h50 v40 h-50 z', color: 'hsl(var(--chart-3))' },
    // Add more representative "countries" or use a proper map SVG
  ];

  return (
    <svg
      viewBox="0 0 600 350" // Adjust viewBox as needed
      className="w-full h-auto max-h-[500px] rounded-md border border-border bg-muted/10"
      aria-label="World map showing soil sample data points"
      data-ai-hint="world map countries"
    >
      <rect width="100%" height="100%" fill="hsl(var(--muted)/0.2)" />
      {countries.map((country) => {
        const count = countryCounts[country.name.toLowerCase()] || 0;
        const hasData = count > 0;
        const fillOpacity = hasData ? Math.min(0.3 + count * 0.1, 1) : 0.1; // Opacity based on count

        return (
          <path
            key={country.id}
            d={country.path}
            fill={hasData ? country.color : 'hsl(var(--muted-foreground))'}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            className={cn(
              "transition-opacity duration-150 ease-in-out",
              "hover:opacity-100 hover:stroke-primary hover:stroke-1"
            )}
            style={{ opacity: fillOpacity }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              // Calculate position relative to the SVG container if possible, or use mouse event client coords
              onCountryHover(country.name, e.clientX, e.clientY);
            }}
            onMouseLeave={onCountryLeave}
            data-country-name={country.name}
          />
        );
      })}
       {/* Placeholder text if no countries have data */}
       {Object.keys(countryCounts).length === 0 && (
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="16">
          No country-specific data available to display on map.
        </text>
      )}
    </svg>
  );
};


export function WorldMapVisualization({ data }: WorldMapVisualizationProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const countrySampleCounts = useMemo(() => {
    if (!Array.isArray(data)) return {};
    return data.reduce((acc, entry) => {
      if (entry.country) {
        const countryName = entry.country.toLowerCase(); // Normalize country name
        acc[countryName] = (acc[countryName] || 0) + 1;
      }
      return acc;
    }, {} as CountrySampleCounts);
  }, [data]);

  const handleCountryHover = (countryName: string, mouseX: number, mouseY: number) => {
    const count = countrySampleCounts[countryName.toLowerCase()] || 0;
    setHoveredCountry(countryName);
    setTooltipContent(`${countryName}: ${count} sample${count !== 1 ? 's' : ''}`);

    // Adjust tooltip position relative to the container or viewport
    if (svgContainerRef.current) {
        const containerRect = svgContainerRef.current.getBoundingClientRect();
        setTooltipPosition({
            x: mouseX - containerRect.left + 10, // Position relative to container
            y: mouseY - containerRect.top - 30,  // Position relative to container
        });
    } else {
        setTooltipPosition({ x: mouseX + 10, y: mouseY - 30 }); // Fallback to viewport relative
    }

  };

  const handleCountryLeave = () => {
    setHoveredCountry(null);
    setTooltipPosition(null);
  };

  return (
    <TooltipProvider>
      <div ref={svgContainerRef} className="relative w-full aspect-[16/9] max-w-3xl mx-auto">
        <WorldMapSVG
          countryCounts={countrySampleCounts}
          onCountryHover={handleCountryHover}
          onCountryLeave={handleCountryLeave}
        />
        {hoveredCountry && tooltipPosition && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-100%)', // Position above cursor
              pointerEvents: 'none', // Allow hover events on map below
            }}
            className="z-50 p-2 text-sm bg-popover text-popover-foreground rounded-md shadow-lg border border-border"
          >
            {tooltipContent}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-2">
          This is a simplified map. Hover over a region to see sample counts. Actual data points are determined by user entries.
        </p>
      </div>
    </TooltipProvider>
  );
}
