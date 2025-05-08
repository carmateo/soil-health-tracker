
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
// import { calculateSoilProperties } from '@/lib/soil-calculations'; // Currently unused due to mock data
import { TrendingUp, HelpCircle, BarChart2, Droplets, Layers3, Wind, Leaf, MapPin as MapPinIcon } from 'lucide-react'; // Changed Sand to Layers3

// Use a TopoJSON file that defines country features
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

interface WorldMapVisualizationProps {
  data: Array<SoilData & { id: string }>; // Data for markers
}

interface AggregatedCountryData {
  name: string;
  sampleCount: number;
  avgVessScore: number | null;
  avgSandPercent: number | null;
  avgClayPercent: number | null;
  avgSiltPercent: number | null;
  avgTawPercent: number | null; // Total Available Water
}

const WorldMapVisualization = ({ data }: WorldMapVisualizationProps) => {
  const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedCountryData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  const mapMarkers = useMemo(() => {
    return data
      .filter(entry => entry.latitude != null && entry.longitude != null)
      .map(entry => ({
        id: entry.id,
        coordinates: [entry.longitude!, entry.latitude!] as [number, number], // Assert non-null as filtered
        name: `Sample ${entry.id.substring(0, 6)}...`,
        locationDetails: [entry.city, entry.region, entry.country].filter(Boolean).join(', ') || 'Details unavailable'
      }));
  }, [data]);

  const handleCountryClick = useCallback((countryName: string) => {
    setSelectedCountryName(countryName);

    // Mock data for display purposes
    const mockSampleCount = Math.floor(Math.random() * 100) + 5;
    const mockAvgVessScore = parseFloat((Math.random() * 4 + 1).toFixed(1));
    const mockSandPercent = parseFloat((Math.random() * 60 + 20).toFixed(1));
    const mockClayPercent = parseFloat((Math.random() * 40 + 10).toFixed(1));
    const mockSiltPercent = parseFloat(Math.max(0, 100 - mockSandPercent - mockClayPercent).toFixed(1));
    const mockTawPercent = parseFloat((Math.random() * 15 + 5).toFixed(1));

    setAggregatedData({
      name: countryName,
      sampleCount: mockSampleCount,
      avgVessScore: mockAvgVessScore,
      avgSandPercent: mockSandPercent,
      avgClayPercent: mockClayPercent,
      avgSiltPercent: mockSiltPercent,
      avgTawPercent: mockTawPercent,
    });
    setIsSheetOpen(true);
  }, []);

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedCountryName(null);
      setAggregatedData(null);
    }
  };


  return (
    <Card className="bg-card shadow-md border-border overflow-hidden">
      <CardHeader>
        <CardTitle>Global Soil Data Overview</CardTitle>
        <CardDescription>
          Interactive map showing locations of public soil data entries. Click on a country to see aggregated data.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 relative aspect-[2/1]">
        <TooltipProvider>
          <ComposableMap
            projectionConfig={{
              rotate: [-10, 0, 0],
              scale: 147,
            }}
            className="w-full h-full bg-card"
            data-ai-hint="world map countries interactive"
          >
            <ZoomableGroup
              center={[0, 20]}
              zoom={currentZoom}
              onZoomEnd={({ zoom }) => setCurrentZoom(zoom)}
              minZoom={1.15} // Adjusted minZoom further to prevent excessive zoom out
              maxZoom={12}
            >
              <Sphere
                stroke="hsl(var(--border))"
                fill="hsl(200, 50%, 92%)" // Light blue for water/sphere
                strokeWidth={0.3}
                id="sphere"
                onClick={() => { handleSheetOpenChange(false); }}
              />
              <Graticule stroke="hsl(var(--border)/0.5)" strokeWidth={0.3} />
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleCountryClick(geo.properties.name || geo.properties.NAME || geo.properties.NAME_EN || 'Unknown Country')}
                      style={{
                        default: {
                          fill: selectedCountryName === (geo.properties.name || geo.properties.NAME || geo.properties.NAME_EN) ? 'hsl(var(--primary)/0.6)' : 'hsl(var(--muted))',
                          stroke: 'hsl(var(--card-foreground)/0.3)',
                          strokeWidth: 0.4,
                          outline: 'none',
                        },
                        hover: {
                          fill: 'hsl(var(--primary)/0.4)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.6,
                          outline: 'none',
                        },
                        pressed: {
                          fill: 'hsl(var(--primary)/0.6)',
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 0.6,
                          outline: 'none',
                        },
                      }}
                      className={cn(
                        "transition-colors duration-150 ease-in-out cursor-pointer",
                        "focus:outline-none"
                      )}
                    />
                  ))
                }
              </Geographies>
              {mapMarkers.map(({ id, name, coordinates, locationDetails }) => {
                const pinBaseSize = 8; // Base size of the pin icon
                const pinSize = pinBaseSize / Math.sqrt(currentZoom); // Adjust size inversely with square root of zoom for smoother scaling
                const strokeWidth = 1 / Math.sqrt(currentZoom);

                return (
                 <Marker key={id} coordinates={coordinates}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* Using a simple circle as a pin for now, can be replaced with an SVG icon */}
                            {/* <circle r={pinSize} fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={strokeWidth} className="transition-all duration-100 ease-out hover:opacity-80 drop-shadow-sm" /> */}
                             <g transform={`translate(${-pinSize / 2}, ${-pinSize})`}>
                                <svg width={pinSize} height={pinSize} viewBox="0 0 24 24" fill="hsl(var(--accent))" stroke="hsl(var(--card-foreground))" strokeWidth={strokeWidth * 2.5} // Adjust stroke width
                                    className="transition-transform duration-150 ease-in-out hover:opacity-80 drop-shadow-sm">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r={Math.max(1.5, 3 / Math.sqrt(currentZoom))} fill="hsl(var(--accent-foreground))"></circle> {/* Inner circle also scales slightly */}
                                </svg>
                            </g>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground rounded-md shadow-lg p-2">
                            <p className="font-semibold text-sm">{name}</p>
                            <p>Lat: {coordinates[1].toFixed(3)}, Lon: {coordinates[0].toFixed(3)}</p>
                            {locationDetails && <p className="text-muted-foreground mt-1">{locationDetails}</p>}
                        </TooltipContent>
                    </Tooltip>
                 </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </TooltipProvider>
      </CardContent>
       <div className="p-3 border-t border-border">
         <p className="text-xs text-muted-foreground text-center">
          Use mouse wheel to zoom, drag to pan. Click a country for details.
        </p>
       </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl font-semibold text-primary">{aggregatedData?.name || 'Country Data'}</SheetTitle>
            <SheetDescription>
              Aggregated soil health data for {aggregatedData?.name || 'the selected country'}.
              <br />
              <span className="text-xs text-muted-foreground italic">(Note: Displayed data is for demonstration purposes only.)</span>
            </SheetDescription>
          </SheetHeader>
          {aggregatedData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-lg flex items-center"><MapPinIcon className="mr-2 h-5 w-5 text-primary" /> Sample Count</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-3xl font-bold">{aggregatedData.sampleCount}</p>
                  <p className="text-sm text-muted-foreground">Total samples recorded.</p>
                </CardContent>
              </Card>

              {aggregatedData.avgVessScore !== null && (
                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg flex items-center"><Leaf className="mr-2 h-5 w-5 text-green-600" />Avg. VESS Score</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-3xl font-bold">{aggregatedData.avgVessScore}</p>
                    <p className="text-sm text-muted-foreground">(1=Poor, 5=Excellent)</p>
                  </CardContent>
                </Card>
              )}

              {(aggregatedData.avgSandPercent !== null || aggregatedData.avgClayPercent !== null || aggregatedData.avgSiltPercent !== null) && (
                <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-orange-500" />Avg. Soil Composition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pb-4">
                    {aggregatedData.avgSandPercent !== null && <p className="text-sm"><Layers3 className="inline mr-1.5 h-4 w-4 text-yellow-600" />Sand: <span className="font-semibold">{aggregatedData.avgSandPercent}%</span></p>}
                    {aggregatedData.avgClayPercent !== null && <p className="text-sm"><Wind className="inline mr-1.5 h-4 w-4 text-red-700" />Clay: <span className="font-semibold">{aggregatedData.avgClayPercent}%</span></p>}
                    {aggregatedData.avgSiltPercent !== null && <p className="text-sm"><TrendingUp className="inline mr-1.5 h-4 w-4 text-gray-500" />Silt: <span className="font-semibold">{aggregatedData.avgSiltPercent}%</span></p>}
                  </CardContent>
                </Card>
              )}

              {aggregatedData.avgTawPercent !== null && (
                 <Card>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg flex items-center"><Droplets className="mr-2 h-5 w-5 text-blue-500" />Avg. Total Available Water</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-3xl font-bold">{aggregatedData.avgTawPercent}%</p>
                     <p className="text-sm text-muted-foreground">Estimated water plant can use.</p>
                  </CardContent>
                </Card>
              )}

              {aggregatedData.sampleCount === 0 && (
                <div className="text-center py-8">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No soil data available for {aggregatedData.name}.</p>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-8">
              <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Click on a country on the map to view its aggregated soil data.</p>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
};

export default React.memo(WorldMapVisualization);
export { WorldMapVisualization };
