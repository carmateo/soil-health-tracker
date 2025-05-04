
'use client';

import { useState, useEffect, useMemo } from 'react';
// Import collectionGroup directly from firestore
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User } from 'lucide-react';
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SoilDataCharts } from '@/components/soil-data-charts';
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart';

export function PublicDataView() {
  const { db } = useFirebase();
  const [publicData, setPublicData] = useState<Array<SoilData & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<'all' | string>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    let unsubscribe = () => {}; // Initialize unsubscribe function

    if (!db) {
      setError("Database connection not available.");
      setLoading(false);
      return;
    }

    try { // Wrap query setup and listener attachment in try-catch
        // Use the imported collectionGroup function
        const soilDataCollectionGroupRef = collectionGroup(db, 'soilData');
        const publicQuery = query(
            soilDataCollectionGroupRef,
            where('privacy', '==', 'public'),
            orderBy('date', 'desc')
            // Note: Firestore collection group queries require an index.
            // You'll need to create a composite index in Firebase console:
            // Collection ID: soilData
            // Fields: privacy (Ascending), date (Descending)
            // Query Scope: Collection group
        );


        unsubscribe = onSnapshot( // Assign unsubscribe within the try block
          publicQuery,
          (querySnapshot: QuerySnapshot<DocumentData>) => {
            console.log(`PublicDataView: Snapshot received: ${querySnapshot.size} public documents.`);
            const fetchedData: Array<SoilData & { id: string }> = [];
            querySnapshot.forEach((doc) => {
              const docData = doc.data();
              // Extract userId from the document path (users/{userId}/soilData/{docId})
              const parentPathSegments = doc.ref.parent.path.split('/');
              // Check if parent path is valid before extracting userId
               if (parentPathSegments.length < 2) {
                  console.warn(`PublicDataView: Invalid document path for doc ${doc.id}, skipping.`);
                  return;
               }
               const userId = parentPathSegments[parentPathSegments.length - 2]; // The segment before 'soilData' should be the userId

              console.log(`PublicDataView: Processing public doc ${doc.id} from user ${userId}:`, docData);

              // Basic validation (similar to dashboard)
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
                userId: userId, // Use the extracted userId
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
                privacy: docData.privacy, // Should always be 'public' based on query
              });
            });
            console.log("PublicDataView: Processed public data:", fetchedData);
            setPublicData(fetchedData);
            setLoading(false);
            setError(null);
          },
          (err) => { // Error handler for onSnapshot
            console.error("PublicDataView: Error fetching public soil data:", err);
            // Check for specific Firestore index error
            if (err.code === 'failed-precondition') {
                 setError("Failed to load public data. A database index is likely required. Please check the Firebase console to create the necessary index for the 'soilData' collection group (querying 'privacy' and ordering by 'date').");
            } else {
                setError(`Failed to load public soil data. Error: ${err.message}. Check console for details.`);
            }
            setLoading(false);
            setPublicData([]);
          }
        );

    } catch (initError) { // Catch errors during query setup
         console.error("PublicDataView: Error initializing query or listener:", initError);
         setError(`Failed to initialize public data view. Error: ${(initError as Error).message}. Ensure Firestore configuration is correct.`);
         setLoading(false);
         setPublicData([]);
    }


    return () => {
      console.log("PublicDataView: Unsubscribing from Firestore listener.");
      unsubscribe(); // Call the unsubscribe function defined outside/inside try
    };
  }, [db]); // Dependency array remains [db]

  // Get unique user IDs for the selector
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    publicData.forEach(entry => ids.add(entry.userId));
    return Array.from(ids);
  }, [publicData]);

  // Filter data based on selected user
  const filteredChartData = useMemo(() => {
    if (selectedUserId === 'all') {
      return publicData;
    }
    return publicData.filter(entry => entry.userId === selectedUserId);
  }, [publicData, selectedUserId]);

  const selectedUserDisplay = useMemo(() => {
    if (selectedUserId === 'all') return 'All Users';
    // Basic obfuscation for display
    return `User ${selectedUserId.substring(0, 6)}...`;
  }, [selectedUserId]);


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
    <div className="space-y-6">
      {/* User Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value)}>
           <SelectTrigger className="w-full sm:w-[250px]">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select User" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
               <div className="flex items-center gap-2">
                 <span>All Users</span>
               </div>
            </SelectItem>
            {userIds.map(id => (
              <SelectItem key={id} value={id}>
                 <div className="flex items-center gap-2">
                    {/* Obfuscate ID in dropdown */}
                    <span>User {id.substring(0, 6)}...</span>
                 </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {userIds.length === 0 && !loading && (
           <p className="text-sm text-muted-foreground">No public users found.</p>
        )}
      </div>

      {/* Charts Section */}
      {publicData.length > 0 ? (
        <div className="space-y-6">
          {/* Soil Data Trends Chart */}
           <Card className="bg-card shadow-md border-border">
             <CardHeader>
               <CardTitle>{selectedUserDisplay}: Data Trends</CardTitle>
               <CardDescription>Visualize soil health trends over time.</CardDescription>
             </CardHeader>
             <CardContent>
               {filteredChartData.length > 0 ? (
                 <SoilDataCharts data={filteredChartData} />
               ) : (
                 <p className="text-center text-muted-foreground py-10">No data available for {selectedUserDisplay} to display trend charts.</p>
               )}
             </CardContent>
           </Card>

           {/* Pedotransfer Analysis Chart */}
            <PedotransferAnalysisChart data={filteredChartData} />
            {/* The PedotransferAnalysisChart already includes its own Card structure */}

            {/* Display message if a specific user is selected but has no composition data */}
            {selectedUserId !== 'all' && filteredChartData.length > 0 && !filteredChartData.some(d => d.measurementType === 'composition' && d.sandPercent != null && d.clayPercent != null) && (
                 <p className="text-sm text-center text-muted-foreground mt-2">
                    No soil composition data found for {selectedUserDisplay} to perform Pedotransfer Analysis.
                 </p>
            )}

        </div>
      ) : (
         <p className="text-center text-muted-foreground py-10">No public soil data found overall.</p>
      )}
    </div>
  );
}

    