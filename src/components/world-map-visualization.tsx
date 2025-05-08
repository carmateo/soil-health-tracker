'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Simplified World Map SVG
const StaticWorldMapSVG = () => {
  // Placeholder countries. A real implementation would use a detailed SVG with accurate paths.
  // The 'fill' colors are placeholders and can be themed or data-driven later.
  const countries = [
    // North America
    { id: 'USA', name: 'United States', path: 'M100,100 h80 v50 h-80 z', fill: 'hsl(var(--chart-1))' },
    { id: 'CAN', name: 'Canada', path: 'M100,50 h80 v40 h-80 z', fill: 'hsl(var(--chart-2))' },
    { id: 'MEX', name: 'Mexico', path: 'M100,160 h60 v30 h-60 z', fill: 'hsl(var(--chart-3))' },
    // South America
    { id: 'BRA', name: 'Brazil', path: 'M180,200 h70 v60 h-70 z', fill: 'hsl(var(--chart-4))' },
    { id: 'ARG', name: 'Argentina', path: 'M170,270 h50 v50 h-50 z', fill: 'hsl(var(--chart-5))' },
    // Europe
    { id: 'GBR', name: 'United Kingdom', path: 'M300,80 h30 v25 h-30 z', fill: 'hsl(var(--accent))' },
    { id: 'FRA', name: 'France', path: 'M320,110 h30 v30 h-30 z', fill: 'hsl(var(--primary))' },
    { id: 'DEU', name: 'Germany', path: 'M340,90 h30 v25 h-30 z', fill: 'hsl(var(--secondary-foreground))' },
    { id: 'ESP', name: 'Spain', path: 'M280,120 h30 v30 h-30 z', fill: 'hsl(var(--chart-1))' },
    // Asia
    { id: 'CHN', name: 'China', path: 'M400,100 h80 v60 h-80 z', fill: 'hsl(var(--chart-2))' },
    { id: 'IND', name: 'India', path: 'M380,170 h60 v50 h-60 z', fill: 'hsl(var(--chart-3))' },
    { id: 'RUS', name: 'Russia', path: 'M350,40 h150 v50 h-150 z', fill: 'hsl(var(--chart-4))' },
    // Africa
    { id: 'EGY', name: 'Egypt', path: 'M330,170 h40 v30 h-40 z', fill: 'hsl(var(--chart-5))' },
    { id: 'ZAF', name: 'South Africa', path: 'M330,250 h50 v40 h-50 z', fill: 'hsl(var(--accent))' },
    // Oceania
    { id: 'AUS', name: 'Australia', path: 'M450,230 h80 v60 h-80 z', fill: 'hsl(var(--primary))' },
  ];

  return (
    <svg
      viewBox="0 0 600 350" // Adjusted viewBox for better aspect ratio of a world map
      className="w-full h-auto max-h-[500px] rounded-md border border-border bg-card shadow-sm"
      aria-label="World map"
      data-ai-hint="world map countries"
    >
      <rect width="100%" height="100%" fill="hsl(var(--card))" /> {/* Background for the map area */}
      {countries.map((country) => (
        <path
          key={country.id}
          d={country.path}
          fill={country.fill || 'hsl(var(--muted))'} // Fallback fill color
          stroke="hsl(var(--border))" // Country borders
          strokeWidth="0.5"
          className={cn(
            "transition-opacity duration-150 ease-in-out opacity-70", // Base opacity
            "hover:opacity-100 hover:stroke-primary hover:stroke-[1px]" // Hover effect
          )}
          data-country-name={country.name} // For potential future interactivity
        />
      ))}
       {countries.length === 0 && ( // Message if no country paths are defined
         <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="16" className="pointer-events-none">
           Map data is currently unavailable.
         </text>
       )}
    </svg>
  );
};

// The data prop is optional and currently not used for this simplified static map.
// It's kept in the interface for potential future enhancements (e.g., data-driven coloring).
interface WorldMapVisualizationProps {
  data?: Array<any>; 
}

export function WorldMapVisualization({ data }: WorldMapVisualizationProps) {
  // The 'data' prop is not used in this simplified version.
  // We are just rendering the static SVG map.
  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto my-4 p-4 bg-background rounded-lg shadow-lg">
      <StaticWorldMapSVG />
       <p className="text-xs text-muted-foreground text-center mt-2">
         This is a simplified world map representation. Interactive features will be added in future updates.
       </p>
    </div>
  );
}
