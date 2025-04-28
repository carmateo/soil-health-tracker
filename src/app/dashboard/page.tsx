
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { SoilDataForm } from '@/components/soil-data-form';
import { SoilDataTable } from '@/components/soil-data-table';
import { UserSettings } from '@/components/user-settings';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Table, Settings, BarChart3, AlertTriangle } from 'lucide-react';
import { SoilDataCharts } from '@/components/soil-data-charts';
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { useFirebase } from '@/context/firebase-context';
import type { SoilData } from '@/types/soil'; // Import the type
import { isValid } from 'date-fns';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { db } = useFirebase(); // Get Firestore instance
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("addData");
  const [isClient, setIsClient] = useState(false);
  const [soilData, setSoilData] = useState<Array<SoilData & { id: string }>>([]); // Use specific type
  const [dataLoading, setDataLoading] = useState(true); // Separate loading state for data
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Callback for form submission success
  const handleFormSubmit = useCallback(() => {
     console.log("Dashboard: Form submitted, switching tab to view data.");
    setActiveTab('viewData');
    // Data update will be handled by the listener
  }, []);

  // Real-time data fetching effect
  useEffect(() => {
    let unsubscribe = () => {}; // Initialize unsubscribe function

    if (user && isClient && db) {
      setDataLoading(true); // Start loading when user/db is available
      setDataError(null); // Reset error
      const dataPath = `users/${user.uid}/soilData`;
      console.log("Dashboard: Setting up listener for path:", dataPath);

      const q = query(
          collection(db, dataPath),
          orderBy('date', 'desc') // Order by date descending for table view initially
      );

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
           console.log(`Dashboard: Snapshot received: ${querySnapshot.size} documents.`); // Debug log
          const fetchedData: Array<SoilData & { id: string }> = [];
          querySnapshot.forEach((doc) => {
             const docData = doc.data();
             console.log(`Dashboard: Processing doc ${doc.id}:`, docData); // Debug log

            // Basic validation (similar to charts, could be centralized)
             let date = docData.date;
             if (!(date instanceof Timestamp)) {
                console.warn(`Dashboard: Doc ${doc.id} has non-Timestamp date:`, docData.date);
                // Attempt conversion or skip
                try {
                    const potentialDate = new Date(date);
                    if (isValid(potentialDate)) {
                       date = Timestamp.fromDate(potentialDate);
                    } else {
                       console.warn(`Dashboard: Doc ${doc.id} has invalid date format, skipping.`);
                       return; // Skip this doc
                    }
                } catch (e) {
                    console.error(`Dashboard: Error converting date for doc ${doc.id}:`, e);
                    return; // Skip this doc
                }
             }
             if (!isValid(date.toDate())) {
                 console.warn(`Dashboard: Doc ${doc.id} has invalid date after conversion, skipping.`);
                 return; // Skip this doc
             }
              if (!docData.measurementType) {
                 console.warn(`Dashboard: Doc ${doc.id} missing measurementType, skipping.`);
                 return; // Skip this doc
             }

             // Construct the SoilData object safely
             fetchedData.push({
               id: doc.id,
               userId: docData.userId || user.uid,
               date: date, // Use validated timestamp
               location: docData.location,
               locationOption: docData.locationOption ?? (docData.latitude ? 'gps' : (docData.location ? 'manual' : undefined)),
               latitude: docData.latitude,
               longitude: docData.longitude,
               measurementType: docData.measurementType,
               vessScore: docData.vessScore,
               sand: docData.sand,
               clay: docData.clay,
               silt: docData.silt,
               sandPercent: docData.sandPercent,
               clayPercent: docData.clayPercent,
               siltPercent: docData.siltPercent,
               privacy: docData.privacy || 'private',
             });
          });
          console.log("Dashboard: Processed data:", fetchedData);
          setSoilData(fetchedData);
          setDataLoading(false); // Stop loading after data is processed
          setDataError(null); // Clear error on success
        },
        (error) => {
          console.error("Dashboard: Error fetching soil data:", error);
          setDataError("Failed to load soil data. Please check your connection or try again later.");
          setDataLoading(false); // Stop loading on error
          setSoilData([]); // Clear data on error
        }
      );
    } else {
       // If user logs out or db is not ready
       setDataLoading(false); // Ensure loading stops if user is not available
       setSoilData([]); // Clear data
       setDataError(null);
    }

    // Cleanup function to unsubscribe when component unmounts or user changes
    return () => {
       console.log("Dashboard: Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, [user, isClient, db]); // Dependencies: run effect when user, client status, or db instance changes


  // Combined loading state
  const isLoading = authLoading || !isClient;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner size={48} />
         <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  // Redirect if not logged in (after initial loading)
  if (!user) {
     // Redirect immediately instead of showing a message
     if (typeof window !== 'undefined') {
         router.push('/');
     }
     return ( // Render spinner during the brief moment before redirection happens
         <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
             <LoadingSpinner size={32} />
             <p className="ml-2">Redirecting to login...</p>
         </div>
     );
  }


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">SoilHealth Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="addData" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Data
          </TabsTrigger>
          <TabsTrigger value="viewData" className="flex items-center gap-2">
            <Table className="h-4 w-4" /> View Data
          </TabsTrigger>
          <TabsTrigger value="analyzeData" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Analyze Data
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent key="addDataTab" value="addData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Add New Soil Sample</CardTitle>
              <CardDescription>Fill in the details for your new soil sample using the stepped form below.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass the callback to the form */}
              <SoilDataForm onFormSubmit={handleFormSubmit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="viewDataTab" value="viewData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Your Soil Data Entries</CardTitle>
              <CardDescription>View, filter, and manage your recorded soil samples.</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                 <div className="flex justify-center items-center py-10">
                    <LoadingSpinner /> <span className="ml-2">Loading data...</span>
                 </div>
               ) : dataError ? (
                 <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 rounded-md bg-destructive/10">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                       <p className="font-semibold">Error Loading Data</p>
                       <p>{dataError}</p>
                    </div>
                 </div>
               ) : (
                 <SoilDataTable data={soilData} />
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="analyzeDataTab" value="analyzeData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Data Analysis</CardTitle>
              <CardDescription>Visualize your soil health trends over time.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass the live data to charts as well */}
               {dataLoading ? (
                  <div className="flex justify-center items-center py-10">
                     <LoadingSpinner /> <span className="ml-2">Loading chart data...</span>
                  </div>
                ) : dataError ? (
                  <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 rounded-md bg-destructive/10">
                     <AlertTriangle className="h-5 w-5" />
                     <div>
                        <p className="font-semibold">Error Loading Charts</p>
                        <p>{dataError}</p>
                     </div>
                  </div>
                ) : (
                  <SoilDataCharts data={soilData} />
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="settingsTab" value="settings">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>Manage your account preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
