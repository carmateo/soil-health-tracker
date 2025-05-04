
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SoilData } from '@/types/soil';
import type { GlobeMethods } from 'react-globe.gl';
import { LoadingSpinner } from './loading-spinner';

// Dynamically import react-globe.gl to ensure it's only loaded client-side
import dynamic from 'next/dynamic';
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-full"><LoadingSpinner /> <span className='ml-2'>Loading Globe...</span></div>,
});

interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  id: string; // Include original ID for potential interaction later
  // Add other properties if needed for tooltips, etc.
  measurementType?: 'vess' | 'composition';
  date?: Date;
}

interface GlobeVisualizationProps {
  data: Array<SoilData & { id: string }>;
}

const GLOBE_IMAGE_URL = '//unpkg.com/three-globe/example/img/earth-night.jpg';
const BACKGROUND_COLOR = 'rgba(0,0,0,0)'; // Transparent background
const POINT_SIZE = 0.3; // Adjust size of the pins
const POINT_ALTITUDE = 0.01; // Slight altitude for visibility
const POINT_COLOR_VESS = 'rgba(59, 130, 246, 0.75)'; // Blue for VESS
const POINT_COLOR_COMPOSITION = 'rgba(34, 197, 94, 0.75)'; // Green for Composition
const POINT_COLOR_OTHER = 'rgba(255, 255, 255, 0.75)'; // White for fallback

export function GlobeVisualization({ data }: GlobeVisualizationProps) {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [points, setPoints] = useState<GlobePoint[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Indicate that component has mounted on the client

    // Initial camera position slightly zoomed out and centered
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
       // Configure controls
       const controls = globeEl.current.controls();
       if (controls) {
         controls.enableZoom = true; // Allow zooming
         controls.autoRotate = true; // Enable auto-rotation
         controls.autoRotateSpeed = 0.3; // Adjust rotation speed
         controls.minDistance = 100; // Set minimum zoom distance
         controls.maxDistance = 600; // Set maximum zoom distance
       }
    }
  }, []);

  useEffect(() => {
    if (!isClient || !Array.isArray(data)) return;

    console.log("GlobeVisualization: Processing data for points:", data.length);
    const validPoints = data
      .filter(
        (entry) =>
          entry.locationOption === 'gps' &&
          typeof entry.latitude === 'number' &&
          !isNaN(entry.latitude) &&
          typeof entry.longitude === 'number' &&
          !isNaN(entry.longitude)
      )
      .map((entry) => ({
        lat: entry.latitude!,
        lng: entry.longitude!,
        size: POINT_SIZE,
        color: entry.measurementType === 'vess' ? POINT_COLOR_VESS : (entry.measurementType === 'composition' ? POINT_COLOR_COMPOSITION : POINT_COLOR_OTHER),
        id: entry.id,
        measurementType: entry.measurementType,
        date: entry.date?.toDate(),
      }));

    console.log("GlobeVisualization: Generated points:", validPoints.length);
    setPoints(validPoints);
  }, [data, isClient]);

  // Memoize globe image URL to prevent unnecessary re-renders
  const globeImageUrl = useMemo(() => GLOBE_IMAGE_URL, []);
   const globeMaterial = useMemo(() => {
      if (typeof window === 'undefined') return null; // Ensure THREE is available
       const THREE = require('three');
       return new THREE.MeshPhongMaterial({
           map: new THREE.TextureLoader().load(globeImageUrl), // Load texture
           // Optional: Add bump map for more detail
           // bumpMap: new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-topology.png'),
           // bumpScale: 0.05,
           // specularMap: new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-water.png'),
           // specular: new THREE.Color('grey'),
           shininess: 10, // Adjust shininess
       });
   }, [isClient, globeImageUrl]);


  if (!isClient) {
    // Render loading or placeholder on the server or before hydration
     return <div className="h-[400px] w-full flex justify-center items-center bg-muted/20 rounded-md border border-border"><LoadingSpinner /> <span className='ml-2'>Initializing Globe...</span></div>;
  }

  return (
    <div className="relative h-[400px] w-full rounded-md border border-border overflow-hidden bg-gradient-to-br from-blue-950 via-black to-indigo-950">
      {/* Render Globe component only on the client */}
      <Globe
        ref={globeEl}
        // Globe appearance
        globeImageUrl={globeImageUrl} // Use basic night image
        // globeMaterial={globeMaterial as any} // Use custom material if needed
        backgroundColor={BACKGROUND_COLOR}
         // Interaction
        animateIn={true}
        // Point markers
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={POINT_ALTITUDE}
        pointRadius="size"
        pointColor="color"
        pointsMerge={true} // Optimize rendering for many points
        pointsTransitionDuration={300} // Animation duration for points
         // Optional: Tooltips on hover
         pointLabel={({ date, measurementType }: GlobePoint) => `
           <div style="background: rgba(40,40,40,0.8); color: white; padding: 5px 8px; border-radius: 4px; font-size: 12px;">
             <b>Type:</b> ${measurementType || 'N/A'}<br/>
             <b>Date:</b> ${date ? date.toLocaleDateString() : 'N/A'}
           </div>
         `}
      />
       <div className="absolute bottom-2 left-2 text-xs text-muted-foreground/80 bg-black/30 px-2 py-1 rounded">
            Drag to rotate. Scroll to zoom. Data points represent public GPS entries.
       </div>
    </div>
  );
}
