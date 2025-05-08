
'use client';

import { useState, useEffect, useMemo } from 'react';
// Import collectionGroup directly from firestore
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, MapPin, AreaChart, Map } from 'lucide-react'; // Changed Globe to Map icon
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SoilDataCharts } from '@/components/soil-data-charts';
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup for view toggle
import { Label } from '@/components/ui/label'; // Import Label for RadioGroup
import { WorldMapVisualization } from '@/components/world-map-visualization'; // Import the new WorldMapVisualization component
import { getLocationKeyAndName, getUniqueLocations } from '@/lib/location-utils'; // Import utility functions


export function PublicDataView() {
  const { db } = useFirebase();
  const [publicData, setPublicData] = useState<Array<SoilData & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // Initialize to null, force selection
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null); // Key for the selected location
  const [viewMode, setViewMode] = useState<'charts' | 'map'>('charts'); // State to toggle between chart view and map view


  useEffect(() => {
    setLoading(true);
    setError(null);
    let unsubscribe = () => {};

    if (!db) {
      setError("Database connection not available.");
      setLoading(false);
      return;
    }

    try {
        const soilDataCollectionGroupRef = collectionGroup(db, 'soilData');
        const publicQuery = query(
            soilDataCollectionGroupRef,
            where('privacy', '==', 'public'),
            orderBy('date', 'desc')
            // Index required: Collection ID: soilData, Fields: privacy (Asc), date (Desc), Scope: Collection group
        );

        unsubscribe = onSnapshot(
          publicQuery,
          (querySnapshot: QuerySnapshot<DocumentData>) => {
            console.log(`PublicDataView: Snapshot received: ${querySnapshot.size} public documents.`);
            const fetchedData: Array<SoilData & { id: string }> = [];
            querySnapshot.forEach((doc) => {
              const docData = doc.data();
              const parentPathSegments = doc.ref.path.split('/');
               if (parentPathSegments.length < 2) {
                  console.warn(`PublicDataView: Invalid document path for doc ${doc.id}, skipping.`);
                  return;
               }
               const userId = parentPathSegments[parentPathSegments.length - 2];

              let date = docData.date;
              if (!(date instanceof Timestamp) || !isValid(date.toDate())) {
                 // Try converting potential Date objects or strings if needed, otherwise skip
                 try {
                   let potentialDate;
                   if (typeof docData.date === 'object' && docData.date !== null && 'seconds' in docData.date && 'nanoseconds' in docData.date) {
                     potentialDate = new Timestamp(docData.date.seconds, docData.date.nanoseconds).toDate();
                   } else if (typeof docData.date === 'string' || typeof docData.date === 'number') {
                     potentialDate = new Date(docData.date);
                   } else if (docData.date instanceof Date) {
                     potentialDate = docData.date;
                   } else {
                     throw new Error('Unrecognized date format');
                   }

                   if (isValid(potentialDate)) {
                     date = Timestamp.fromDate(potentialDate);
                   } else {
                     console.warn(`PublicDataView: Doc ${doc.id} has invalid date format after attempt, skipping.`);
                     return;
                   }
                 } catch (e) {
                   console.error(`PublicDataView: Error converting date for doc ${doc.id}:`, e);
                   return;
                 }
              }

              if (!docData.measurementType || (docData.measurementType !== 'vess' && docData.measurementType !== 'composition')) {
                  console.warn(`PublicDataView: Doc ${doc.id} missing or invalid measurementType, skipping.`);
                  return;
              }
              if (!userId) {
                  console.warn(`PublicDataView: Could not determine userId for doc ${doc.id}, skipping.`);
                  return;
              }

              fetchedData.push({
                id: doc.id,
                userId: userId,
                date: date, // Store as Firestore Timestamp
                location: docData.location ?? null,
                locationOption: docData.locationOption ?? (docData.latitude ? 'gps' : (docData.location ? 'manual' : undefined)),
                latitude: docData.latitude ?? null,
                longitude: docData.longitude ?? null,
                country: docData.country ?? null,
                region: docData.region ?? null,
                city: docData.city ?? null,
                measurementType: docData.measurementType,
                vessScore: docData.measurementType === 'vess' ? (docData.vessScore ?? null) : null,
                sand: docData.measurementType === 'composition' ? (docData.sand ?? null) : null,
                clay: docData.measurementType === 'composition' ? (docData.clay ?? null) : null,
                silt: docData.measurementType === 'composition' ? (docData.silt ?? null) : null,
                sandPercent: docData.measurementType === 'composition' ? (docData.sandPercent ?? null) : null,
                clayPercent: docData.measurementType === 'composition' ? (docData.clayPercent ?? null) : null,
                siltPercent: docData.measurementType === 'composition' ? (docData.siltPercent ?? null) : null,
                privacy: docData.privacy,
              });
            });
            console.log("PublicDataView: Processed public data:", fetchedData);
            setPublicData(fetchedData);

            // Automatically select the first user if none is selected and data exists (only for 'charts' view)
            if (viewMode === 'charts' && !selectedUserId && fetchedData.length > 0) {
                const firstUserId = fetchedData[0].userId;
                setSelectedUserId(firstUserId);
                // Also select the first location for that user
                const firstUserLocations = getUniqueLocations(fetchedData.filter(d => d.userId === firstUserId));
                if (firstUserLocations.length > 0) {
                    setSelectedLocationKey(firstUserLocations[0].key);
                } else {
                    setSelectedLocationKey(null); // No locations for the first user?
                }
            } else if (selectedUserId && selectedLocationKey && viewMode === 'charts') {
                // Check if selected user/location combo still exists
                const userLocations = getUniqueLocations(fetchedData.filter(d => d.userId === selectedUserId));
                if (!userLocations.some(loc => loc.key === selectedLocationKey)) {
                    // If selected location is gone for the user, select the first available, or null
                    setSelectedLocationKey(userLocations.length > 0 ? userLocations[0].key : null);
                }
            } else if (selectedUserId && viewMode === 'charts') {
                 // Check if the selected user still has ANY locations
                 const userLocations = getUniqueLocations(fetchedData.filter(d => d.userId === selectedUserId));
                 if (userLocations.length === 0) {
                     // If user has no locations anymore, reset user selection or select next user?
                     // For simplicity, let's reset the location key only
                     setSelectedLocationKey(null);
                 } else if (!selectedLocationKey) {
                     // If user is selected but location isn't (e.g., after reset), select first location
                     setSelectedLocationKey(userLocations[0].key);
                 }
            }

            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error("PublicDataView: Error fetching public soil data:", err);
            if (err.code === 'failed-precondition') {
                 setError("Failed to load public data. A database index is likely required. Please check the Firebase console to create the necessary index for the 'soilData' collection group (querying 'privacy' and ordering by 'date').");
            } else {
                setError(`Failed to load public soil data. Error: ${err.message}. Check console for details.`);
            }
            setLoading(false);
            setPublicData([]);
          }
        );

    } catch (initError) {
         console.error("PublicDataView: Error initializing query or listener:", initError);
         setError(`Failed to initialize public data view. Error: ${(initError as Error).message}. Ensure Firestore configuration is correct.`);
         setLoading(false);
         setPublicData([]);
    }

    return () => {
      console.log("PublicDataView: Unsubscribing from Firestore listener.");
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]); // Rerun only when db changes

  // Get unique user IDs for the selector
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    publicData.forEach(entry => ids.add(entry.userId));
    return Array.from(ids);
  }, [publicData]);


  // Get unique locations *for the selected user* using the utility function
  const uniqueLocations = useMemo(() => {
    if (!selectedUserId) return [];
    return getUniqueLocations(publicData.filter(entry => entry.userId === selectedUserId));
  }, [publicData, selectedUserId]);


  // Filter data based on selected user *and* selected location (for charts view)
  const filteredChartData = useMemo(() => {
     if (viewMode !== 'charts' || !selectedUserId || !selectedLocationKey) {
      return []; // Don't show chart data if not in charts view or user/location isn't selected
    }
    return publicData.filter(entry => {
        const entryLocationKey = getLocationKeyAndName(entry).key;
        return entry.userId === selectedUserId && entryLocationKey === selectedLocationKey;
    });
  }, [publicData, selectedUserId, selectedLocationKey, viewMode]);

  // Data for the map (all public GPS entries)
  const mapData = useMemo(() => {
    if (viewMode !== 'map') return [];
    // For map, we need all public data, not just GPS entries if we want country counts
    return publicData;
  }, [publicData, viewMode]);


  const selectedUserDisplay = useMemo(() => {
    if (!selectedUserId) return 'No User Selected';
    // Basic obfuscation for display
    return `User ${selectedUserId.substring(0, 6)}...`;
  }, [selectedUserId]);

  const selectedLocationDisplay = useMemo(() => {
    if (!selectedLocationKey) return 'No Location Selected';
    const location = uniqueLocations.find(loc => loc.key === selectedLocationKey);
    return location ? location.name : 'Unknown Location';
  }, [selectedLocationKey, uniqueLocations]);

  // Handle user selection change - reset location
  const handleUserChange = (userId: string) => {
      setSelectedUserId(userId);
      // Find locations for the *newly* selected user using utility function
      const newLocations = getUniqueLocations(publicData.filter(entry => entry.userId === userId));
      if (newLocations.length > 0) {
          // Select the first location for the new user
          setSelectedLocationKey(newLocations[0].key);
      } else {
          // No locations for this user
          setSelectedLocationKey(null);
      }
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'charts' | 'map') => {
      setViewMode(mode);
      if (mode === 'charts' && !selectedUserId && userIds.length > 0) {
          handleUserChange(userIds[0]);
      }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner /> <span className="ml-2">Loading public data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Public Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
     <TooltipProvider>
    <div className="space-y-6">

       {/* View Mode Toggle */}
       <div className="flex justify-center mb-6">
         <RadioGroup value={viewMode} onValueChange={(value) => handleViewModeChange(value as 'charts' | 'map')} className="flex space-x-4 border border-border p-1 rounded-md bg-muted">
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="charts" id="view-charts" />
             <Label htmlFor="view-charts" className="flex items-center gap-1 cursor-pointer"><AreaChart className="h-4 w-4" /> Charts by User/Location</Label>
           </div>
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="map" id="view-map" />
             <Label htmlFor="view-map" className="flex items-center gap-1 cursor-pointer"><Map className="h-4 w-4" /> World Map View</Label>
           </div>
         </RadioGroup>
       </div>

      {/* Conditional Rendering based on viewMode */}
      {viewMode === 'charts' && (
        <>
          {/* User and Location Selectors - Only show in charts mode */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* User Selector */}
            <Select value={selectedUserId ?? ""} onValueChange={handleUserChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select User" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {userIds.length === 0 && !loading ? (
                    <SelectItem value="no-users" disabled>No public users found</SelectItem>
                ) : (
                    userIds.map(id => (
                    <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                        <span>User {id.substring(0, 6)}...</span>
                        </div>
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>

            {/* Location Selector - Only enabled if a user is selected */}
            <Select
                value={selectedLocationKey ?? ""}
                onValueChange={(key) => setSelectedLocationKey(key)}
                disabled={!selectedUserId || uniqueLocations.length === 0}
                >
              <SelectTrigger className="w-full sm:w-[300px]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={selectedUserId ? "Select Location" : "Select User First"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {uniqueLocations.length === 0 && selectedUserId ? (
                    <SelectItem value="no-locations" disabled>No locations for this user</SelectItem>
                ) : (
                    uniqueLocations.map(loc => (
                        <SelectItem key={loc.key} value={loc.key}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 truncate max-w-[280px]">
                                        <span>{loc.name}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="start">
                                    <p>{loc.fullDetails}</p>
                                </TooltipContent>
                            </Tooltip>
                        </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Charts Section - Only show if both user and location are selected */}
          {selectedUserId && selectedLocationKey ? (
            <>
            {filteredChartData.length > 0 ? (
                <div className="space-y-6">
                    {/* Soil Data Trends Chart */}
                    <Card className="bg-card shadow-md border-border">
                        <CardHeader>
                        <CardTitle>{selectedUserDisplay} - {selectedLocationDisplay}: Data Trends</CardTitle>
                        <CardDescription>Visualize soil health trends over time for the selected location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SoilDataCharts data={filteredChartData} locationName={selectedLocationDisplay}/>
                        </CardContent>
                    </Card>

                    {/* Pedotransfer Analysis Chart */}
                    <PedotransferAnalysisChart data={filteredChartData} locationName={selectedLocationDisplay}/>

                    {/* Message if no composition data for the selection */}
                    {!filteredChartData.some(d => d.measurementType === 'composition' && d.sandPercent != null && d.clayPercent != null) && (
                        <p className="text-sm text-center text-muted-foreground mt-2">
                            No soil composition data found for {selectedUserDisplay} at {selectedLocationDisplay} to perform Pedotransfer Analysis.
                        </p>
                    )}

                </div>
            ) : (
                <p className="text-center text-muted-foreground py-10">No data available for {selectedUserDisplay} at {selectedLocationDisplay}.</p>
            )}
            </>
          ) : (
            // Prompt to select user and location
            <p className="text-center text-muted-foreground py-10">
                {publicData.length === 0 ? 'No public soil data found overall.' : (selectedUserId ? 'Please select a location for this user.' : 'Please select a user to view their locations and data.')}
            </p>
          )}
        </>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
          <Card className="bg-card shadow-md border-border">
             <CardHeader>
                 <CardTitle>World Map Soil Data</CardTitle>
                 <CardDescription>Interactive map showing locations of public soil data entries. Hover over a country to see sample counts.</CardDescription>
             </CardHeader>
             <CardContent>
                 {mapData.length > 0 ? (
                     <WorldMapVisualization data={mapData} />
                 ) : (
                    <p className="text-center text-muted-foreground py-10">
                        No public data found to display on the map.
                     </p>
                 )}
             </CardContent>
         </Card>
      )}

    </div>
     </TooltipProvider>
  );
}

