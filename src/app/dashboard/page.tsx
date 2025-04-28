
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SoilDataForm } from '@/components/soil-data-form';
import { SoilDataTable } from '@/components/soil-data-table';
import { UserSettings } from '@/components/user-settings';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Table, Settings, BarChart3 } from 'lucide-react';
import { SoilDataCharts } from '@/components/soil-data-charts';


export default function Dashboard() {
  const { user, loading: authLoading } = useAuth(); // Renamed loading to authLoading for clarity
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("addData");
  const [isClient, setIsClient] = useState(false); // State to track if component has mounted

  // Track mounting state
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Redirect if not logged in after initial load
  useEffect(() => {
    if (!authLoading && !user && isClient) {
        console.log("Redirecting to login from dashboard...");
      router.push('/');
    }
  }, [user, authLoading, router, isClient]);


  // Display loading spinner during initial auth check or if not mounted yet
  if (authLoading || !isClient) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // If user is definitely not logged in (and client has mounted), show redirect message
  if (!user) {
     return (
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] space-y-4">
         <p className="text-muted-foreground">You need to be logged in to view this page.</p>
         <p className="text-muted-foreground text-sm">Redirecting to login...</p>
         <LoadingSpinner size={32} />
       </div>
    );
  }

 // User is logged in, render the dashboard
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

        <TabsContent value="addData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Add New Soil Sample</CardTitle>
              <CardDescription>Fill in the details for your new soil sample.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* Pass onFormSubmit to potentially switch tabs after successful save */}
               <SoilDataForm onFormSubmit={() => setActiveTab('viewData')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viewData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Your Soil Data Entries</CardTitle>
              <CardDescription>View, edit, or delete your recorded soil samples within a date range.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* SoilDataTable now fetches its own data */}
              <SoilDataTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyzeData">
          <Card className="bg-secondary shadow-md">
            <CardHeader>
              <CardTitle>Data Analysis</CardTitle>
              <CardDescription>Visualize your soil health trends over time.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* SoilDataCharts now fetches its own data */}
              <SoilDataCharts />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
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
