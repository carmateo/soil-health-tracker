
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
import { calculateSoilProperties } from '@/lib/soil-calculations';
import { TrendingUp, HelpCircle, BarChart2, Droplets, Layers, Wind, Leaf, MapPin } from 'lucide-react'; // Replaced Sand with Layers, MapPinIcon with MapPin

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
    const countryEntries = data.filter(entry => entry.country?.toLowerCase() === countryName.toLowerCase());
    
    let sumVessScore = 0;
    let vessCount = 0;
    let sumSandPercent = 0;
    let sumClayPercent = 0;
    let sumSiltPercent = 0;
    // let sumTawPercent = 0; // This was unused
    let compositionCount = 0;

    countryEntries.forEach(entry => {
      if (entry.measurementType === 'vess' && typeof entry.vessScore === 'number') {
        sumVessScore += entry.vessScore;
        vessCount++;
      } else if (entry.measurementType === 'composition') {
        let entryAddedToCompositionCount = false;
        if (typeof entry.sandPercent === 'number') {
          sumSandPercent += entry.sandPercent;
          if (!entryAddedToCompositionCount) { compositionCount++; entryAddedToCompositionCount = true; }
        }
        if (typeof entry.clayPercent === 'number') {
          sumClayPercent += entry.clayPercent;
          if (!entryAddedToCompositionCount) { compositionCount++; entryAddedToCompositionCount = true; }
        }
        if (typeof entry.siltPercent === 'number') {
          sumSiltPercent += entry.siltPercent;
          if (!entryAddedToCompositionCount) { compositionCount++; entryAddedToCompositionCount = true; }
        }
        
        // TAW calculation handled separately below for clarity
      }
    });
    
    let validTawEntries = 0;
    let tempSumTaw = 0;
    countryEntries.forEach(entry => {
        if (entry.measurementType === 'composition' && 
            typeof entry.clayPercent === 'number' && 
            typeof entry.sandPercent === 'number') {
            const properties = calculateSoilProperties(entry.clayPercent, entry.sandPercent);
            if (properties && typeof properties.availableWater === 'number') {
                tempSumTaw += properties.availableWater;
                validTawEntries++;
            }
        }
    });


    setAggregatedData({
      name: countryName,
      sampleCount: countryEntries.length,
      avgVessScore: vessCount > 0 ? parseFloat((sumVessScore / vessCount).toFixed(2)) : null,
      avgSandPercent: compositionCount > 0 ? parseFloat((sumSandPercent / compositionCount).toFixed(2)) : null,
      avgClayPercent: compositionCount > 0 ? parseFloat((sumClayPercent / compositionCount).toFixed(2)) : null,
      avgSiltPercent: compositionCount > 0 ? parseFloat((sumSiltPercent / compositionCount).toFixed(2)) : null,
      avgTawPercent: validTawEntries > 0 ? parseFloat((tempSumTaw / validTawEntries).toFixed(2)) : null,
    });
    setIsSheetOpen(true);
  }, [data]);

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedCountryName(null);
      setAggregatedData(null);
    }
  };
  
  const markerScale = useCallback(() => Math.max(0.3 / currentZoom, 0.1), [currentZoom]);


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
              minZoom={0.75} 
              maxZoom={12} // Increased maxZoom
            >
              <Sphere
                stroke="hsl(var(--border))"
                fill="hsl(200, 50%, 92%)" 
                strokeWidth={0.3}
                id="sphere"
                onClick={() => { handleSheetOpenChange(false); }} // Close sheet on sphere click
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
              {mapMarkers.map(({ id, name, coordinates, locationDetails }) => (
                 <Marker key={id} coordinates={coordinates}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <g transform={`scale(${markerScale()}) translate(-1.25 -1.25)`}> {/* Center the slightly smaller circle */}
                                <circle r={1.25} fill="hsl(var(--accent))" stroke="hsl(var(--accent-foreground))" strokeWidth={0.25} className="transition-all drop-shadow-sm hover:r-[1.75px]"/>
                            </g>
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
          Use mouse wheel to zoom, drag to pan. Click a country for details.
        </p>
       </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl font-semibold text-primary">{aggregatedData?.name || 'Country Data'}</SheetTitle>
            <SheetDescription>
              Aggregated soil health data for {aggregatedData?.name || 'the selected country'}.
            </SheetDescription>
          </SheetHeader>
          {aggregatedData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center"><MapPin className="mr-2 h-5 w-5 text-primary" /> Sample Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{aggregatedData.sampleCount}</p>
                  <p className="text-sm text-muted-foreground">Total samples recorded.</p>
                </CardContent>
              </Card>

              {aggregatedData.sampleCount > 0 ? (
                <>
                  {aggregatedData.avgVessScore !== null && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center"><Leaf className="mr-2 h-5 w-5 text-green-600" />Avg. VESS Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{aggregatedData.avgVessScore}</p>
                        <p className="text-sm text-muted-foreground">(1=Poor, 5=Excellent)</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {(aggregatedData.avgSandPercent !== null || aggregatedData.avgClayPercent !== null || aggregatedData.avgSiltPercent !== null) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-orange-500" />Avg. Soil Composition</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {aggregatedData.avgSandPercent !== null && <p><Layers className="inline mr-1 h-4 w-4 text-yellow-600" />Sand: {aggregatedData.avgSandPercent}%</p>}
                        {aggregatedData.avgClayPercent !== null && <p><Wind className="inline mr-1 h-4 w-4 text-red-700" />Clay: {aggregatedData.avgClayPercent}%</p>}
                        {aggregatedData.avgSiltPercent !== null && <p><TrendingUp className="inline mr-1 h-4 w-4 text-gray-500" />Silt: {aggregatedData.avgSiltPercent}%</p>}
                      </CardContent>
                    </Card>
                  )}

                  {aggregatedData.avgTawPercent !== null && (
                     <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center"><Droplets className="mr-2 h-5 w-5 text-blue-500" />Avg. Total Available Water</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{aggregatedData.avgTawPercent}%</p>
                         <p className="text-sm text-muted-foreground">Estimated water plant can use.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No soil data available for {aggregatedData.name}.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
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

