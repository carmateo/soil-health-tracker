
'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Import collectionGroup directly from firestore
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, MapPin, AreaChart, MapPinIcon as MapIconLucide, GitCompareArrows } from 'lucide-react'; // Renamed MapPin to MapPinIcon to avoid conflict
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SoilDataCharts } from '@/components/soil-data-charts';
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup for view toggle
import { Label } from '@/components/ui/label'; // Import Label for RadioGroup
import { WorldMapVisualization } from '@/components/world-map-visualization';
import { LocationComparisonView } from '@/components/location-comparison-view'; // Import new component
import { getLocationKeyAndName, getUniqueLocations } from '@/lib/location-utils';


export function PublicDataView() {
  const { db } = useFirebase();
  const [publicData, setPublicData] = useState<Array<SoilData & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'charts' | 'map' | 'comparison'>('charts'); // Added 'comparison'


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
               const userId = parentPathSegments[parentPathSegments.length - 3]; // users/{userId}/soilData/{docId}

              let date = docData.date;
              if (!(date instanceof Timestamp) || !isValid(date.toDate())) {
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
                userEmail: docData.userEmail || `user_${userId.substring(0, 6)}@example.com`, // Keep for potential future use, but not for display label
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

            // Auto-selection logic for users and locations
            const uniqueUserIds = Array.from(new Set(fetchedData.map(d => d.userId))).sort();
            const usersForDropdown = uniqueUserIds.map((uid, index) => ({
                id: uid,
                displayLabel: `User ${index + 1}`
            }));


            if (viewMode === 'charts' && !selectedUserId && usersForDropdown.length > 0) {
                const firstUserId = usersForDropdown[0].id;
                setSelectedUserId(firstUserId);
                const firstUserLocations = getUniqueLocations(fetchedData.filter(d => d.userId === firstUserId));
                if (firstUserLocations.length > 0) {
                    setSelectedLocationKey(firstUserLocations[0].key);
                } else {
                    setSelectedLocationKey(null);
                }
            } else if (selectedUserId && selectedLocationKey && viewMode === 'charts') {
                // Ensure current selection is still valid
                const userExists = usersForDropdown.some(u => u.id === selectedUserId);
                if (userExists) {
                    const userLocations = getUniqueLocations(fetchedData.filter(d => d.userId === selectedUserId));
                    if (!userLocations.some(loc => loc.key === selectedLocationKey)) {
                        setSelectedLocationKey(userLocations.length > 0 ? userLocations[0].key : null);
                    }
                } else {
                    // Selected user no longer exists, reset
                    setSelectedUserId(usersForDropdown.length > 0 ? usersForDropdown[0].id : null);
                    setSelectedLocationKey(null); // Reset location as well
                     if (usersForDropdown.length > 0) { // if there are users, select the first one's first location
                        const firstUserLocations = getUniqueLocations(fetchedData.filter(d => d.userId === usersForDropdown[0].id));
                        if (firstUserLocations.length > 0) {
                            setSelectedLocationKey(firstUserLocations[0].key);
                        }
                    }
                }

            } else if (selectedUserId && viewMode === 'charts') { // User is selected, but maybe no location or location became invalid
                 const userLocations = getUniqueLocations(fetchedData.filter(d => d.userId === selectedUserId));
                 if (userLocations.length === 0) { // No locations for this user
                     setSelectedLocationKey(null);
                 } else if (!selectedLocationKey || !userLocations.some(loc => loc.key === selectedLocationKey)) { // No location selected OR selected location is no longer valid
                     setSelectedLocationKey(userLocations[0].key); // Select the first available for this user
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
  }, [db]); 

  const publicUsers = useMemo(() => {
    const uniqueUserIds = Array.from(new Set(publicData.map(d => d.userId))).sort();
    return uniqueUserIds.map((uid, index) => ({
        id: uid,
        displayLabel: `User ${index + 1}`
    }));
  }, [publicData]);


  const uniqueLocations = useMemo(() => {
    if (!selectedUserId) return [];
    return getUniqueLocations(publicData.filter(entry => entry.userId === selectedUserId));
  }, [publicData, selectedUserId]);

  const filteredChartData = useMemo(() => {
     if (viewMode !== 'charts' || !selectedUserId || !selectedLocationKey) {
      return [];
    }
    return publicData.filter(entry => {
        const entryLocationKey = getLocationKeyAndName(entry).key;
        return entry.userId === selectedUserId && entryLocationKey === selectedLocationKey;
    });
  }, [publicData, selectedUserId, selectedLocationKey, viewMode]);

  const mapData = useMemo(() => {
    if (viewMode !== 'map') return [];
    return publicData.filter(entry => entry.latitude != null && entry.longitude != null);
  }, [publicData, viewMode]);

  const selectedUserDisplay = useMemo(() => {
    if (!selectedUserId) return 'No User Selected';
    const user = publicUsers.find(u => u.id === selectedUserId);
    return user ? user.displayLabel : `User ID ${selectedUserId.substring(0,6)}...`;
  }, [selectedUserId, publicUsers]);

  const selectedLocationDisplay = useMemo(() => {
    if (!selectedLocationKey) return 'No Location Selected';
    const location = uniqueLocations.find(loc => loc.key === selectedLocationKey);
    return location ? location.name : 'Unknown Location';
  }, [selectedLocationKey, uniqueLocations]);

  const handleUserChange = (userId: string) => {
      setSelectedUserId(userId);
      const newLocations = getUniqueLocations(publicData.filter(entry => entry.userId === userId));
      if (newLocations.length > 0) {
          setSelectedLocationKey(newLocations[0].key);
      } else {
          setSelectedLocationKey(null);
      }
  };

  const handleViewModeChange = (mode: 'charts' | 'map' | 'comparison') => {
      setViewMode(mode);
      if (mode === 'charts' && !selectedUserId && publicUsers.length > 0) {
          handleUserChange(publicUsers[0].id);
      } else if (mode === 'charts' && selectedUserId && !selectedLocationKey && uniqueLocations.length > 0) {
          setSelectedLocationKey(uniqueLocations[0].key);
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
       <div className="flex justify-center mb-6">
         <RadioGroup value={viewMode} onValueChange={(value) => handleViewModeChange(value as 'charts' | 'map' | 'comparison')} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 border border-border p-1 rounded-md bg-muted">
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="charts" id="view-charts" />
             <Label htmlFor="view-charts" className="flex items-center gap-1 cursor-pointer"><AreaChart className="h-4 w-4" /> Charts by User/Location</Label>
           </div>
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="map" id="view-map" />
             <Label htmlFor="view-map" className="flex items-center gap-1 cursor-pointer"><MapIconLucide className="h-4 w-4" /> World Map View</Label>
           </div>
           <div className="flex items-center space-x-2">
             <RadioGroupItem value="comparison" id="view-comparison" />
             <Label htmlFor="view-comparison" className="flex items-center gap-1 cursor-pointer"><GitCompareArrows className="h-4 w-4" /> Compare Locations</Label>
           </div>
         </RadioGroup>
       </div>

      {viewMode === 'charts' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Select value={selectedUserId ?? ""} onValueChange={handleUserChange}>
              <SelectTrigger className="w-full sm:w-[200px]"> 
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select User" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {publicUsers.length === 0 && !loading ? (
                    <SelectItem value="no-users" disabled>No public users found</SelectItem>
                ) : (
                    publicUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                           <span>{user.displayLabel}</span>
                        </div>
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>

            <Select
                value={selectedLocationKey ?? ""}
                onValueChange={(key) => setSelectedLocationKey(key)}
                disabled={!selectedUserId || uniqueLocations.length === 0}
                >
              <SelectTrigger className="w-full sm:w-[300px]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={selectedUserId ? (uniqueLocations.length > 0 ? "Select Location" : "No locations for this user") : "Select User First"} />
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

          {selectedUserId && selectedLocationKey ? (
            <>
            {filteredChartData.length > 0 ? (
                <div className="space-y-6">
                    <Card className="bg-card shadow-md border-border">
                        <CardHeader>
                        <CardTitle>{selectedUserDisplay} - {selectedLocationDisplay}: Data Trends</CardTitle>
                        <CardDescription>Visualize soil health trends over time for the selected location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SoilDataCharts data={filteredChartData} locationName={selectedLocationDisplay}/>
                        </CardContent>
                    </Card>

                    <PedotransferAnalysisChart data={filteredChartData} locationName={selectedLocationDisplay}/>

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
            <p className="text-center text-muted-foreground py-10">
                {publicData.length === 0 ? 'No public soil data found overall.' : (selectedUserId ? (uniqueLocations.length > 0 ? 'Please select a location for this user.' : `No locations found for ${selectedUserDisplay}.`) : 'Please select a user to view their locations and data.')}
            </p>
          )}
        </>
      )}

      {viewMode === 'map' && (
          mapData.length > 0 ? (
              <WorldMapVisualization data={mapData} />
           ) : (
            <Card className="bg-card shadow-md border-border">
                 <CardHeader>
                     <CardTitle>World Map Soil Data</CardTitle>
                     <CardDescription>Interactive map showing locations of public soil data entries.</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <p className="text-center text-muted-foreground py-10">
                        No public data with GPS coordinates found to display on the map.
                     </p>
                 </CardContent>
            </Card>
           )
      )}

      {viewMode === 'comparison' && (
        <LocationComparisonView />
      )}

    </div>
     </TooltipProvider>
  );
}

