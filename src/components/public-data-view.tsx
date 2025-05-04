
'use client';

import { useState, useEffect, useMemo } from 'react';
// Import collectionGroup directly from firestore
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot, collectionGroup } from 'firebase/firestore';
import { useFirebase } from '@/context/firebase-context';
import { SoilDataTable } from '@/components/soil-data-table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';

// Interface for grouping data by user
interface UserPublicData {
  userId: string; // Or potentially user display name if fetched
  data: Array<SoilData & { id: string }>;
}

export function PublicDataView() {
  const { db } = useFirebase();
  const [publicData, setPublicData] = useState<Array<SoilData & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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


  // Group data by user ID (optional, depending on desired display)
  const groupedData = useMemo(() => {
    const groups: Record<string, UserPublicData> = {};
    publicData.forEach(entry => {
      if (!groups[entry.userId]) {
        groups[entry.userId] = { userId: entry.userId, data: [] };
      }
      groups[entry.userId].data.push(entry);
    });
    return Object.values(groups);
  }, [publicData]);


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
      {/* Option 1: Show a single table with all public data */}
      <SoilDataTable data={publicData} onEdit={() => {}} onDelete={async () => {}} showActions={false} />

      {/* Option 2: Iterate through grouped data and show a table per user (might be too much) */}
      {/* {groupedData.map(group => (
        <Card key={group.userId}>
          <CardHeader>
            <CardTitle>Data from User {group.userId.substring(0, 6)}...</CardTitle> {/* Obfuscate user ID */}
          {/* </CardHeader>
          <CardContent>
            <SoilDataTable data={group.data} onEdit={() => {}} onDelete={async () => {}} showActions={false} />
          </CardContent>
        </Card>
      ))} */}

       {publicData.length === 0 && !loading && (
           <p className="text-center text-muted-foreground py-10">No public soil data found.</p>
       )}
    </div>
  );
}
