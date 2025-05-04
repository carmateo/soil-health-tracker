
'use client';

import { useState, useEffect, useMemo } from 'react';
// Import collectionGroup directly from firestore
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, MapPin } from 'lucide-react'; // Added MapPin icon
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SoilDataCharts } from '@/components/soil-data-charts';
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

export function PublicDataView() {
  const { db } = useFirebase();
  const [publicData, setPublicData] = useState<Array<SoilData & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // Initialize to null, force selection
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null); // Key for the selected location


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
              const parentPathSegments = doc.ref.parent.path.split('/');
               if (parentPathSegments.length < 2) {
                  console.warn(`PublicDataView: Invalid document path for doc ${doc.id}, skipping.`);
                  return;
               }
               const userId = parentPathSegments[parentPathSegments.length - 2];

              let date = docData.date;
              if (!(date instanceof Timestamp) || !isValid(date.toDate())) {
                 console.warn(`PublicDataView: Doc ${doc.id} has invalid date, skipping.`);
                 return;
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
                date: date,
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

            // Automatically select the first user if none is selected and data exists
            if (!selectedUserId && fetchedData.length > 0) {
                const firstUserId = fetchedData[0].userId;
                setSelectedUserId(firstUserId);
                // Also select the first location for that user
                const firstUserLocations = getUniqueLocations(fetchedData.filter(d => d.userId === firstUserId));
                if (firstUserLocations.length > 0) {
                    setSelectedLocationKey(firstUserLocations[0].key);
                } else {
                    setSelectedLocationKey(null); // No locations for the first user?
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

  // Function to generate a unique key and display name for each location
  const getLocationKeyAndName = (entry: SoilData): { key: string; name: string; fullDetails: string } => {
    if (entry.locationOption === 'manual' && entry.location) {
      const key = `manual_${entry.location}`;
      return { key, name: entry.location, fullDetails: entry.location };
    } else if (entry.locationOption === 'gps' && entry.latitude != null && entry.longitude != null) {
      const lat = entry.latitude.toFixed(4);
      const lon = entry.longitude.toFixed(4);
      const key = `gps_${lat}_${lon}`;
      const detailsArray = [entry.city, entry.region, entry.country].filter(Boolean);
      const detailsString = detailsArray.length > 0 ? ` (${detailsArray.join(', ')})` : '';
      const name = `GPS: ${lat}, ${lon}${detailsString.length > 20 ? detailsString.substring(0, 17) + '...' : detailsString}`;
      const fullDetails = `Lat: ${entry.latitude.toFixed(5)}, Lon: ${entry.longitude.toFixed(5)}${detailsArray.length > 0 ? ` (${detailsArray.join(', ')})` : ''}`;
      return { key, name, fullDetails };
    }
    const key = `unknown_${entry.id}`; // Fallback key
    return { key, name: 'Unknown Location', fullDetails: 'No location data' };
  };

  // Get unique locations *for the selected user*
  const uniqueLocations = useMemo(() => {
    if (!selectedUserId) return [];
    return getUniqueLocations(publicData.filter(entry => entry.userId === selectedUserId));
  }, [publicData, selectedUserId]);

  // Helper to extract unique locations
  function getUniqueLocations(data: Array<SoilData & { id: string }>): Array<{ key: string; name: string; fullDetails: string }> {
      const locationsMap = new Map<string, { name: string; fullDetails: string }>();
      data.forEach(entry => {
          const { key, name, fullDetails } = getLocationKeyAndName(entry);
          if (!locationsMap.has(key)) {
              locationsMap.set(key, { name, fullDetails });
          }
      });
      return Array.from(locationsMap.entries()).map(([key, { name, fullDetails }]) => ({ key, name, fullDetails }));
  }


  // Filter data based on selected user *and* selected location
  const filteredChartData = useMemo(() => {
     if (!selectedUserId || !selectedLocationKey) {
      return []; // Don't show data if user or location isn't selected
    }
    return publicData.filter(entry => {
        const entryLocationKey = getLocationKeyAndName(entry).key;
        return entry.userId === selectedUserId && entryLocationKey === selectedLocationKey;
    });
  }, [publicData, selectedUserId, selectedLocationKey]);

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
      // Find locations for the *newly* selected user
      const newLocations = getUniqueLocations(publicData.filter(entry => entry.userId === userId));
      if (newLocations.length > 0) {
          // Select the first location for the new user
          setSelectedLocationKey(newLocations[0].key);
      } else {
          // No locations for this user
          setSelectedLocationKey(null);
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
      {/* User and Location Selectors */}
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
                                <div className="flex items-center gap-2 truncate">
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
                        <SoilDataCharts data={filteredChartData} />
                    </CardContent>
                </Card>

                {/* Pedotransfer Analysis Chart */}
                <PedotransferAnalysisChart data={filteredChartData} />

                {/* Message if no composition data for the selection */}
                {!filteredChartData.some(d => d.measurementType === 'composition' && d.sandPercent != null && d.clayPercent != null) && (
                    <p className="text-sm text-center text-muted-foreground mt-2">
                        No soil composition data found for {selectedUserDisplay} at {selectedLocationDisplay} to perform Pedotransfer Analysis.
                    </p>
                )}

            </div>
         ) : (
            // This case might occur if the selected user/location combo has no data (though filtering should handle this)
            // Or if data is still loading/filtering
            <p className="text-center text-muted-foreground py-10">No data available for {selectedUserDisplay} at {selectedLocationDisplay}.</p>
         )}
         </>
      ) : (
         // Prompt to select user and location
         <p className="text-center text-muted-foreground py-10">
            {publicData.length === 0 ? 'No public soil data found overall.' : 'Please select a user and location to view their data.'}
         </p>
      )}
    </div>
     </TooltipProvider>
  );
}

    