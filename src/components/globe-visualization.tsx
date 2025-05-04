
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SoilData } from '@/types/soil';
import type { GlobeMethods } from 'react-globe.gl';
import { LoadingSpinner } from './loading-spinner';
import * as THREE from 'three'; // Import THREE directly

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

const GLOBE_IMAGE_URL = '//unpkg.com/three-globe/example/img/earth-day.jpg'; // Use day image for potentially clearer boundaries
const BACKGROUND_COLOR = 'rgba(0,0,0,0)'; // Transparent background
const POINT_SIZE = 0.3; // Adjust size of the pins
const POINT_ALTITUDE = 0.01; // Slight altitude for visibility
const POINT_COLOR_VESS = 'rgba(59, 130, 246, 0.75)'; // Blue for VESS
const POINT_COLOR_COMPOSITION = 'rgba(34, 197, 94, 0.75)'; // Green for Composition
const POINT_COLOR_OTHER = 'rgba(255, 255, 255, 0.75)'; // White for fallback
const INITIAL_ALTITUDE = 2.0; // Set a fixed optimal zoom level (altitude)

export function GlobeVisualization({ data }: GlobeVisualizationProps) {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [points, setPoints] = useState<GlobePoint[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    setIsClient(true); // Indicate that component has mounted on the client

    // Load texture only on the client
    const loader = new THREE.TextureLoader();
    loader.load(GLOBE_IMAGE_URL, (loadedTexture) => {
      setTexture(loadedTexture);
    });


    // Set initial camera position and configure controls
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: INITIAL_ALTITUDE }, 1000); // Use the fixed altitude
       // Configure controls
       const controls = globeEl.current.controls();
       if (controls) {
         controls.enableZoom = false; // Disable zooming
         controls.autoRotate = true; // Enable auto-rotation
         controls.autoRotateSpeed = 0.3; // Adjust rotation speed
         // Remove min/max distance as zoom is disabled
         // controls.minDistance = 100;
         // controls.maxDistance = 600;
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

  // Memoize the globe material based on the loaded texture
  const globeMaterial = useMemo(() => {
     if (!texture) return null; // Don't create material until texture is loaded
     return new THREE.MeshPhongMaterial({
         map: texture,
         color: '#ffffff', // Ensure map color isn't tinted unexpectedly
         shininess: 5, // Reduce shininess for a less 'plasticky' look
         transparent: false, // Ensure it's not transparent
         opacity: 1,
         // Avoid bump/specular maps for simplicity and performance
         // bumpMap: undefined,
         // specularMap: undefined,
     });
   }, [texture]); // Recreate material only when texture changes


  if (!isClient) {
    // Render loading or placeholder on the server or before hydration
     return <div className="h-[400px] w-full flex justify-center items-center bg-muted/20 rounded-md border border-border"><LoadingSpinner /> <span className='ml-2'>Initializing Globe...</span></div>;
  }

  return (
    <div className="relative h-[400px] w-full rounded-md border border-border overflow-hidden bg-gradient-to-br from-blue-950 via-black to-indigo-950">
      {/* Render Globe component only on the client and when material is ready */}
      {globeMaterial ? (
        <Globe
            ref={globeEl}
            // Globe appearance
            // globeImageUrl={GLOBE_IMAGE_URL} // Use material instead
            globeMaterial={globeMaterial as any} // Use the simplified Phong material
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
      ) : (
         <div className="flex justify-center items-center h-full"><LoadingSpinner /> <span className='ml-2'>Loading Globe Texture...</span></div>
      )}
       <div className="absolute bottom-2 left-2 text-xs text-muted-foreground/80 bg-black/30 px-2 py-1 rounded">
            Drag to rotate. Data points represent public GPS entries. Zoom disabled.
       </div>
    </div>
  );
}
