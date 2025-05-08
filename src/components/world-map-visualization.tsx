
'use client';

import React, { useState, memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Sphere,
  Graticule,
  Marker
} from 'react-simple-maps';
import type { SoilData } from '@/types/soil';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Use a TopoJSON file that defines country features
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

interface WorldMapVisualizationProps {
  data: Array<SoilData & { id: string }>; // Data for markers
}

const WorldMapVisualization = ({ data }: WorldMapVisualizationProps) => {
  // Markers for GPS coordinates
  const mapMarkers = React.useMemo(() => {
    return data
      .filter(entry => entry.latitude != null && entry.longitude != null)
      .map(entry => ({
        id: entry.id,
        coordinates: [entry.longitude, entry.latitude] as [number, number],
        name: `Sample ${entry.id.substring(0,6)}...`, // Truncated name for brevity
        locationDetails: [entry.city, entry.region, entry.country].filter(Boolean).join(', ') || 'Details unavailable'
      }));
  }, [data]);

  return (
    <Card className="bg-card shadow-md border-border overflow-hidden">
      <CardHeader>
        <CardTitle>World Map Soil Data</CardTitle>
        <CardDescription>
          Interactive map showing locations of public soil data entries. Hover over a marker or country for details.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 relative aspect-[2/1]"> {/* Use aspect ratio for responsive height */}
        <TooltipProvider>
          <ComposableMap
            projectionConfig={{
              rotate: [-10, 0, 0],
              scale: 147, // Initial scale
            }}
            className="w-full h-full bg-card" // map background using card color
            data-ai-hint="world map countries interactive"
          >
            <ZoomableGroup center={[0, 20]} zoom={1} minZoom={0.75} maxZoom={8}> {/* Allow some zoom, but not excessive */}
              <Sphere
                stroke="hsl(var(--border))"
                fill="hsl(200, 50%, 92%)" // Soft, light blue for water/sphere, more subtle
                strokeWidth={0.3} // Thinner sphere stroke
                id="sphere"
              />
              <Graticule stroke="hsl(var(--border)/0.5)" strokeWidth={0.3} /> {/* Lighter graticule */}
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: 'hsl(var(--muted))', // Land color from theme
                          stroke: 'hsl(var(--card-foreground)/0.3)', // Country border color, subtle
                          strokeWidth: 0.4, // Slightly thicker country borders
                          outline: 'none',
                        },
                        hover: {
                          fill: 'hsl(var(--accent)/0.3)', // Subtle accent fill on hover
                          stroke: 'hsl(var(--primary))', // Highlight border on hover
                          strokeWidth: 0.6, // Thicker border on hover
                          outline: 'none',
                        },
                        pressed: {
                          fill: 'hsl(var(--accent)/0.5)', // Darker accent fill on press
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.6,
                          outline: 'none',
                        },
                      }}
                      className={cn(
                        "transition-colors duration-150 ease-in-out", // Smooth transition
                        "focus:outline-none"
                      )}
                    />
                  ))
                }
              </Geographies>
              {/* Render markers for specific data points */}
              {mapMarkers.map(({ id, name, coordinates, locationDetails }) => (
                 <Marker key={id} coordinates={coordinates}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* Brighter, slightly larger marker with a subtle shadow */}
                            <circle r={3} fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" strokeWidth={0.5} className="transition-all cursor-pointer drop-shadow-sm hover:r-[4px]"/>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground rounded-md shadow-lg p-2">
                            <p className="font-semibold text-sm">{name}</p>
                            <p>Lat: {coordinates[1].toFixed(3)}, Lon: {coordinates[0].toFixed(3)}</p>
                            {locationDetails && <p className="text-muted-foreground mt-1">{locationDetails}</p>}
                        </TooltipContent>
                    </Tooltip>
                 </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </TooltipProvider>
      </CardContent>
       <div className="p-3 border-t border-border">
         <p className="text-xs text-muted-foreground text-center">
          Use mouse wheel to zoom, drag to pan. Hover over data points for details.
        </p>
       </div>
    </Card>
  );
};

export default memo(WorldMapVisualization);
export { WorldMapVisualization };
