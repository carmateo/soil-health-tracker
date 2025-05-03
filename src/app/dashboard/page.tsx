
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
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart'; // Import the new component
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
                    // Handle different date representations (e.g., seconds/nanoseconds object)
                    let potentialDate;
                    if (typeof docData.date === 'object' && docData.date !== null && 'seconds' in docData.date && 'nanoseconds' in docData.date) {
                        potentialDate = new Timestamp(docData.date.seconds, docData.date.nanoseconds).toDate();
                    } else if (typeof docData.date === 'string' || typeof docData.date === 'number') {
                         potentialDate = new Date(docData.date);
                    } else {
                        throw new Error('Unrecognized date format');
                    }

                    if (isValid(potentialDate)) {
                       date = Timestamp.fromDate(potentialDate);
                    } else {
                       console.warn(`Dashboard: Doc ${doc.id} has invalid date format after attempt, skipping.`);
                       return; // Skip this doc
                    }
                } catch (e) {
                    console.error(`Dashboard: Error converting date for doc ${doc.id}:`, e);
                    return; // Skip this doc
                }
             } else if (!isValid(date.toDate())) { // Validate even if it's already a Timestamp
                 console.warn(`Dashboard: Doc ${doc.id} has invalid date within Timestamp, skipping.`);
                 return; // Skip this doc
             }
              if (!docData.measurementType || (docData.measurementType !== 'vess' && docData.measurementType !== 'composition')) {
                 console.warn(`Dashboard: Doc ${doc.id} missing or invalid measurementType, skipping.`);
                 return; // Skip this doc
             }

             // Construct the SoilData object safely
             fetchedData.push({
               id: doc.id,
               userId: docData.userId || user.uid,
               date: date, // Use validated timestamp
               location: docData.location ?? null, // Ensure null if missing
               locationOption: docData.locationOption ?? (docData.latitude ? 'gps' : (docData.location ? 'manual' : undefined)),
               latitude: docData.latitude ?? null,
               longitude: docData.longitude ?? null,
               measurementType: docData.measurementType,
               vessScore: docData.measurementType === 'vess' ? (docData.vessScore ?? null) : null,
               sand: docData.measurementType === 'composition' ? (docData.sand ?? null) : null,
               clay: docData.measurementType === 'composition' ? (docData.clay ?? null) : null,
               silt: docData.measurementType === 'composition' ? (docData.silt ?? null) : null,
               sandPercent: docData.measurementType === 'composition' ? (docData.sandPercent ?? null) : null,
               clayPercent: docData.measurementType === 'composition' ? (docData.clayPercent ?? null) : null,
               siltPercent: docData.measurementType === 'composition' ? (docData.siltPercent ?? null) : null,
               privacy: docData.privacy || 'private',
             });
          });
          console.log("Dashboard: Processed data for table/charts:", fetchedData);
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
       // Ensure loading stops if user is not available
       // Check if auth is still loading before setting dataLoading to false
       if (!authLoading) {
           setDataLoading(false);
       }
       setSoilData([]); // Clear data
       setDataError(null);
    }

    // Cleanup function to unsubscribe when component unmounts or user changes
    return () => {
       console.log("Dashboard: Unsubscribing from Firestore listener.");
      unsubscribe();
    };
    // Include authLoading in dependencies to handle cases where user becomes available but auth is still initializing
  }, [user, isClient, db, authLoading]);


  // Combined loading state for initial page load
  const isLoading = authLoading || !isClient;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner size={48} />
         <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  // Redirect if not logged in (after initial loading checks)
  if (!user && !authLoading) {
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
      <h1 className="text-3xl font-bold text-primary">SHDC Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Adjusted grid layout for better responsiveness and added more margin-bottom on mobile */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 mb-8 md:mb-16">
          <TabsTrigger value="addData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" /> Add Data
          </TabsTrigger>
          <TabsTrigger value="viewData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Table className="h-4 w-4 sm:h-5 sm:w-5" /> View Data
          </TabsTrigger>
          <TabsTrigger value="analyzeData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> Analyze Data
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent key="addDataTab" value="addData">
          <Card className="bg-card shadow-md border-border">
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
           <Card className="bg-card shadow-md border-border">
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
          <div className="space-y-6"> {/* Add spacing between cards */}
            {/* Original Data Trends Card */}
            <Card className="bg-card shadow-md border-border">
              <CardHeader>
                <CardTitle>Data Trends</CardTitle>
                <CardDescription>Visualize your soil health trends over time.</CardDescription>
              </CardHeader>
              <CardContent>
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

            {/* New Pedotransfer Analysis Card */}
            {dataLoading ? (
               <Card className="bg-card shadow-md border-border">
                   <CardHeader><CardTitle>Pedotransfer Analysis</CardTitle></CardHeader>
                   <CardContent className="flex justify-center items-center py-10">
                      <LoadingSpinner /> <span className="ml-2">Loading analysis data...</span>
                   </CardContent>
                </Card>
             ) : dataError ? (
                <Card className="bg-card shadow-md border-border">
                    <CardHeader><CardTitle>Pedotransfer Analysis</CardTitle></CardHeader>
                    <CardContent>
                       <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 rounded-md bg-destructive/10">
                           <AlertTriangle className="h-5 w-5" />
                           <div>
                               <p className="font-semibold">Error Loading Analysis</p>
                               <p>{dataError}</p>
                           </div>
                       </div>
                    </CardContent>
                </Card>
              ) : (
                // Render the chart component, it handles its own empty/error state internally based on processed data
                <PedotransferAnalysisChart data={soilData} />
            )}
          </div>
        </TabsContent>

        <TabsContent key="settingsTab" value="settings">
          <Card className="bg-card shadow-md border-border">
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
