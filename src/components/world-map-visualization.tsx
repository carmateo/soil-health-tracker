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

const geoUrl =
  'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json';

interface WorldMapVisualizationProps {
  data: Array<SoilData & { id: string }>; // Expecting data for markers and tooltips
}

interface CountryData {
  name: string;
  sampleCount: number;
}

const WorldMapVisualization = ({ data }: WorldMapVisualizationProps) => {
  const [tooltipContent, setTooltipContent] = useState<CountryData | null>(null);

  // Process data to count samples per country (assuming country is available in SoilData)
  const countrySampleCounts = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    data.forEach(entry => {
      if (entry.country) {
        counts[entry.country] = (counts[entry.country] || 0) + 1;
      }
    });
    return counts;
  }, [data]);

  // Prepare markers for GPS coordinates
  const mapMarkers = React.useMemo(() => {
    return data
      .filter(entry => entry.latitude != null && entry.longitude != null)
      .map(entry => ({
        id: entry.id,
        coordinates: [entry.longitude, entry.latitude] as [number, number],
        name: `Sample ${entry.id.substring(0,6)}`,
      }));
  }, [data]);

  return (
    <Card className="bg-card shadow-md border-border">
      <CardHeader>
        <CardTitle>World Map Soil Data</CardTitle>
        <CardDescription>
          Interactive map showing locations of public soil data entries. Hover over a country or marker for details.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2 relative"> {/* Reduced padding on small screens */}
        <TooltipProvider>
          <ComposableMap
            projectionConfig={{
              rotate: [-10, 0, 0],
              scale: 147, // Adjust scale as needed
            }}
            width={800} // Intrinsic width
            height={400} // Intrinsic height
            className="w-full h-auto max-h-[500px] rounded-md bg-background" // Responsive styling
            data-ai-hint="world map countries interactive"
          >
            <ZoomableGroup center={[0, 20]} zoom={1} filterZoom={false}> {/* filterZoom={false} to show all details */}
              <Sphere
                stroke="hsl(var(--border))"
                fill="hsl(210, 60%, 95%)" // Light blue fill for water/sphere
                strokeWidth={0.5}
                id="sphere"
              />
              <Graticule stroke="hsl(var(--border))" strokeWidth={0.5} />
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const countryName = geo.properties.NAME || geo.properties.name || 'Unknown'; // common property names for country name
                    const sampleCount = countrySampleCounts[countryName] || 0;
                    const hasData = sampleCount > 0;

                    return (
                      <Tooltip key={geo.rsmKey}>
                        <TooltipTrigger asChild>
                          <Geography
                            geography={geo}
                            onMouseEnter={() => {
                              setTooltipContent({ name: countryName, sampleCount });
                            }}
                            onMouseLeave={() => {
                              setTooltipContent(null);
                            }}
                            style={{
                              default: {
                                fill: hasData ? 'hsl(var(--primary)/0.7)' : 'hsl(var(--muted))', // Muted for land, primary-variant if has data
                                outline: 'none',
                                stroke: 'hsl(var(--border))', // Country borders
                                strokeWidth: 0.3,
                              },
                              hover: {
                                fill: 'hsl(var(--primary))', // Primary color on hover
                                outline: 'none',
                                stroke: 'hsl(var(--foreground))',
                                strokeWidth: 0.5,
                              },
                              pressed: {
                                fill: 'hsl(var(--primary)/0.9)',
                                outline: 'none',
                              },
                            }}
                            className={cn(
                              "transition-colors duration-100 ease-in-out",
                              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background"
                            )}
                          />
                        </TooltipTrigger>
                        {/* Tooltip content is now handled by the external state `tooltipContent` and rendered below */}
                      </Tooltip>
                    );
                  })
                }
              </Geographies>
              {/* Render markers for specific data points */}
              {mapMarkers.map(({ id, name, coordinates }) => (
                 <Marker key={id} coordinates={coordinates}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <circle r={3} fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={0.5} className="hover:r-4 transition-all cursor-pointer"/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{name}</p>
                            <p>Lat: {coordinates[1].toFixed(3)}, Lon: {coordinates[0].toFixed(3)}</p>
                        </TooltipContent>
                    </Tooltip>
                 </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {/* Custom Tooltip Display for Country Hover */}
          {tooltipContent && (
            <div
              className="absolute p-2 text-xs rounded-md shadow-lg pointer-events-none bg-popover text-popover-foreground border border-border"
              style={{
                // This is a very basic way to show the tooltip.
                // For a real app, you'd track mouse position to place it dynamically.
                // react-simple-maps doesn't offer a built-in dynamic tooltip container outside of markers.
                bottom: '20px', // Adjusted position
                left: '20px',  // Adjusted position
                opacity: 0.9,
                zIndex: 1000, 
              }}
            >
              <p className="font-semibold">{tooltipContent.name}</p>
              <p>Samples: {tooltipContent.sampleCount}</p>
            </div>
          )}
        </TooltipProvider>
         <p className="text-xs text-muted-foreground text-center mt-2 px-2 pb-2">
          Scroll to zoom, drag to pan. Hover over countries or data points for details.
        </p>
      </CardContent>
    </Card>
  );
};

export default memo(WorldMapVisualization);
// Exporting as default and memoized for performance if props don't change often.
// Re-exporting for the component file name convention:
export { WorldMapVisualization };

