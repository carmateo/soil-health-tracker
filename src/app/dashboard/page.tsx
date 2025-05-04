
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { SoilDataForm } from '@/components/soil-data-form';
import { SoilDataTable } from '@/components/soil-data-table';
import { UserSettings } from '@/components/user-settings';
import { PublicDataView } from '@/components/public-data-view'; // Import the new component
import { LoadingSpinner } from '@/components/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Table, Settings, BarChart3, AlertTriangle, Edit, XCircle, Users } from 'lucide-react'; // Added Users icon
import { SoilDataCharts } from '@/components/soil-data-charts';
import { PedotransferAnalysisChart } from '@/components/pedotransfer-analysis-chart';
import { collection, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useFirebase } from '@/context/firebase-context';
import type { SoilData } from '@/types/soil';
import { isValid } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { db } = useFirebase();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("addData");
  const [isClient, setIsClient] = useState(false);
  const [soilData, setSoilData] = useState<Array<SoilData & { id: string }>>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<(SoilData & { id: string }) | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleFormSubmit = useCallback(() => {
     console.log("Dashboard: Form submitted, switching tab to view data.");
     setEditingEntry(null);
     setActiveTab('viewData');
  }, []);

  const handleEdit = useCallback((entry: SoilData & { id: string }) => {
    console.log("Dashboard: Starting edit for entry:", entry.id);
    setEditingEntry(entry);
    setActiveTab('editData');
  }, []);

   const handleCancelEdit = useCallback(() => {
       console.log("Dashboard: Cancelling edit.");
       setEditingEntry(null);
       setActiveTab('viewData');
   }, []);

  const handleDelete = useCallback(async (entryId: string) => {
    if (!user || !db) {
      console.error("Delete error: User or DB not available.");
      throw new Error("Authentication or database connection issue.");
    }
    console.log("Dashboard: Deleting entry:", entryId);
    const docRef = doc(db, `users/${user.uid}/soilData`, entryId);
    try {
      await deleteDoc(docRef);
      console.log("Dashboard: Entry deleted successfully:", entryId);
    } catch (error) {
      console.error("Dashboard: Error deleting entry:", error);
      throw error;
    }
  }, [user, db]);


  useEffect(() => {
    let unsubscribe = () => {};

    if (user && isClient && db) {
      setDataLoading(true);
      setDataError(null);
      const dataPath = `users/${user.uid}/soilData`;
      console.log("Dashboard: Setting up listener for path:", dataPath);

      const q = query(
          collection(db, dataPath),
          orderBy('date', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
           console.log(`Dashboard: Snapshot received: ${querySnapshot.size} documents.`);
          const fetchedData: Array<SoilData & { id: string }> = [];
          querySnapshot.forEach((doc) => {
             const docData = doc.data();
             console.log(`Dashboard: Processing doc ${doc.id}:`, docData);

             let date = docData.date;
             if (!(date instanceof Timestamp)) {
                console.warn(`Dashboard: Doc ${doc.id} has non-Timestamp date:`, docData.date);
                try {
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
                       return;
                    }
                } catch (e) {
                    console.error(`Dashboard: Error converting date for doc ${doc.id}:`, e);
                    return;
                }
             } else if (!isValid(date.toDate())) {
                 console.warn(`Dashboard: Doc ${doc.id} has invalid date within Timestamp, skipping.`);
                 return;
             }
              if (!docData.measurementType || (docData.measurementType !== 'vess' && docData.measurementType !== 'composition')) {
                 console.warn(`Dashboard: Doc ${doc.id} missing or invalid measurementType, skipping.`);
                 return;
             }

             fetchedData.push({
               id: doc.id,
               userId: docData.userId || user.uid,
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
               privacy: docData.privacy || 'private',
             });
          });
          console.log("Dashboard: Processed data for table/charts:", fetchedData);
          setSoilData(fetchedData);
          setDataLoading(false);
          setDataError(null);
        },
        (error) => {
          console.error("Dashboard: Error fetching soil data:", error);
          setDataError("Failed to load soil data. Please check your connection or try again later.");
          setDataLoading(false);
          setSoilData([]);
        }
      );
    } else {
       if (!authLoading) {
           setDataLoading(false);
       }
       setSoilData([]);
       setDataError(null);
    }

    return () => {
       console.log("Dashboard: Unsubscribing from Firestore listener.");
      unsubscribe();
    };
  }, [user, isClient, db, authLoading]);


  const isLoading = authLoading || !isClient;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner size={48} />
         <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  if (!user && !authLoading) {
     if (typeof window !== 'undefined') {
         router.push('/');
     }
     return (
         <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
             <LoadingSpinner size={32} />
             <p className="ml-2">Redirecting to login...</p>
         </div>
     );
  }


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Adjusted grid to 5 columns for the new tab */}
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-2 mb-8 md:mb-12">
          <TabsTrigger value="addData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" /> Add Data
          </TabsTrigger>
          <TabsTrigger value="viewData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Table className="h-4 w-4 sm:h-5 sm:w-5" /> View Data
          </TabsTrigger>
           <TabsTrigger value="analyzeData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" /> Analyze Data
          </TabsTrigger>
           {/* New Public Data Tab */}
          <TabsTrigger value="publicData" className="flex items-center justify-center gap-2 text-sm sm:text-base">
             <Users className="h-4 w-4 sm:h-5 sm:w-5" /> Public Data
           </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" /> Settings
          </TabsTrigger>
          {/* Hidden trigger for edit state */}
           <TabsTrigger value="editData" className="hidden"></TabsTrigger>
        </TabsList>

        <TabsContent key="addDataTab" value="addData">
          <Card className="bg-card shadow-md border-border">
            <CardHeader>
              <CardTitle>Add New Soil Sample</CardTitle>
              <CardDescription>Fill in the details for your new soil sample using the stepped form below.</CardDescription>
            </CardHeader>
            <CardContent>
              <SoilDataForm onFormSubmit={handleFormSubmit} />
            </CardContent>
          </Card>
        </TabsContent>

         {/* Content for Editing an Entry */}
         <TabsContent key="editDataTab" value="editData">
          <Card className="bg-card shadow-md border-border">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Edit Soil Sample</CardTitle>
                    <CardDescription>Update the details for this soil sample.</CardDescription>
                 </div>
                 <Button variant="outline" size="sm" onClick={handleCancelEdit} className="ml-auto">
                    <XCircle className="mr-1 h-4 w-4" /> Cancel Edit
                 </Button>
            </CardHeader>
            <CardContent>
              {editingEntry ? (
                <SoilDataForm
                  key={editingEntry.id}
                  initialData={editingEntry}
                  onFormSubmit={handleFormSubmit}
                />
              ) : (
                 <p className="text-muted-foreground">No entry selected for editing. Please go back to 'View Data'.</p>
              )}
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
                 <SoilDataTable data={soilData} onEdit={handleEdit} onDelete={handleDelete} showActions={true} />
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="analyzeDataTab" value="analyzeData">
          <div className="space-y-6">
            <Card className="bg-card shadow-md border-border">
              <CardHeader>
                <CardTitle>Your Data Trends</CardTitle>
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

            {dataLoading ? (
               <Card className="bg-card shadow-md border-border">
                   <CardHeader><CardTitle>Your Pedotransfer Analysis</CardTitle></CardHeader>
                   <CardContent className="flex justify-center items-center py-10">
                      <LoadingSpinner /> <span className="ml-2">Loading analysis data...</span>
                   </CardContent>
                </Card>
             ) : dataError ? (
                <Card className="bg-card shadow-md border-border">
                    <CardHeader><CardTitle>Your Pedotransfer Analysis</CardTitle></CardHeader>
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
                <PedotransferAnalysisChart data={soilData} />
            )}
          </div>
        </TabsContent>

        {/* New Public Data Tab Content */}
         <TabsContent key="publicDataTab" value="publicData">
           <Card className="bg-card shadow-md border-border">
             <CardHeader>
               <CardTitle>Public Soil Data</CardTitle>
               <CardDescription>Explore soil data shared publicly by other users.</CardDescription>
             </CardHeader>
             <CardContent>
               <PublicDataView />
             </CardContent>
           </Card>
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

    