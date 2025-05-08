
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
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json'; // Changed from land-110m.json to countries-110m.json

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
    <Card className="bg-card shadow-md border-border">
      <CardHeader>
        <CardTitle>World Map Soil Data</CardTitle>
        <CardDescription>
          Interactive map showing locations of public soil data entries. Hover over a marker for details.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2 relative">
        <TooltipProvider>
          <ComposableMap
            projectionConfig={{
              rotate: [-10, 0, 0],
              scale: 147,
            }}
            width={800}
            height={400}
            className="w-full h-auto max-h-[500px] rounded-md bg-background"
            data-ai-hint="world map countries interactive"
          >
            <ZoomableGroup center={[0, 20]} zoom={1}> {/* filterZoom removed as it's not a valid prop */}
              <Sphere
                stroke="hsl(var(--border))"
                fill="hsl(210, 60%, 95%)" // Light blue fill for water/sphere
                strokeWidth={0.5}
                id="sphere"
              />
              <Graticule stroke="hsl(var(--border))" strokeWidth={0.5} />
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: 'hsl(var(--muted))', // Land color (beige)
                          stroke: 'hsl(var(--foreground)/0.5)', // Country border color
                          strokeWidth: 0.25, // Thinner stroke for country borders
                          outline: 'none',
                        },
                        hover: {
                          fill: 'hsl(var(--muted)/0.8)', // Slightly darker land on hover
                          stroke: 'hsl(var(--primary))', // Highlight border on hover
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        pressed: {
                          fill: 'hsl(var(--muted)/0.7)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                      }}
                      className={cn(
                        "transition-colors duration-100 ease-in-out",
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
                            <circle r={3.5} fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth={0.75} className="hover:r-[4.5px] transition-all cursor-pointer shadow-md"/>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                            <p className="font-semibold">{name}</p>
                            <p>Lat: {coordinates[1].toFixed(3)}, Lon: {coordinates[0].toFixed(3)}</p>
                            {locationDetails && <p className="text-muted-foreground">{locationDetails}</p>}
                        </TooltipContent>
                    </Tooltip>
                 </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
        </TooltipProvider>
         <p className="text-xs text-muted-foreground text-center mt-2 px-2 pb-2">
          Scroll to zoom, drag to pan. Hover over data points for details.
        </p>
      </CardContent>
    </Card>
  );
};

export default memo(WorldMapVisualization);
export { WorldMapVisualization };

