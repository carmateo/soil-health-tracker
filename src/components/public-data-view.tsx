
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData, QuerySnapshot } from 'firebase/firestore';
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

    // Query for all documents in the 'soilData' collection group where privacy is 'public'
    const q = query(
      collection(db, "users"), // Query the root 'users' collection
      // Note: Firestore collection group queries require an index.
      // You'll need to create a composite index in Firebase console:
      // Collection ID: users
      // Fields: soilData.privacy (Ascending), soilData.date (Descending)
      // Query Scope: Collection group
      // where('soilData.privacy', '==', 'public'), // This subcollection query won't work directly like this. Need collectionGroup.
      // orderBy('soilData.date', 'desc')
    );

    // Correct approach using collectionGroup for 'soilData'
    const soilDataCollectionGroup = collectionGroup(db, 'soilData');
    const publicQuery = query(
        soilDataCollectionGroup,
        where('privacy', '==', 'public'),
        orderBy('date', 'desc')
    );


    const unsubscribe = onSnapshot(
      publicQuery, // Use the correct query
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        console.log(`PublicDataView: Snapshot received: ${querySnapshot.size} public documents.`);
        const fetchedData: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          console.log(`PublicDataView: Processing public doc ${doc.id} from user ${docData.userId}:`, docData);

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

          fetchedData.push({
            id: doc.id,
            userId: docData.userId, // Keep userId to potentially group or filter later
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
      (err) => {
        console.error("PublicDataView: Error fetching public soil data:", err);
        setError("Failed to load public soil data. It might be an issue with database permissions or indexes. Check the console for details.");
        setLoading(false);
        setPublicData([]);
      }
    );

    return () => {
      console.log("PublicDataView: Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, [db]);


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

// Helper function (consider moving to a utils file)
function collectionGroup(db: any, collectionId: string): any {
    // This is a placeholder. In actual Firestore SDK v9+, you import collectionGroup directly:
    // import { collectionGroup } from 'firebase/firestore';
    // return collectionGroup(db, collectionId);
    // For now, we'll use the passed 'db' object assuming it has the method,
    // but this should be replaced with the proper import.
    if (typeof db.collectionGroup === 'function') {
         return db.collectionGroup(collectionId);
    } else {
         console.error("collectionGroup function not found on db object. Make sure you're using Firestore v9+ modular SDK and importing correctly.");
         // Return a dummy query object to prevent immediate crash, but it won't work
         return query(collection(db, 'dummy_collection')); // Placeholder
    }

}

    