
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("addData");

  // ✨ Remove useState for soilData and fetchingData here
  // const [soilData, setSoilData] = useState<any[]>([]);
  // const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    // ✨ Remove data fetching logic from here.
    // SoilDataTable and SoilDataCharts will fetch their own data using onSnapshot
  }, [user, loading, router]);


  if (loading) { // ✨ Only check for auth loading now
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  // Ensure user is loaded and exists before rendering dashboard content
  if (!user) {
     // Can show a message or redirect again, though useEffect should handle it
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <p>Redirecting to login...</p>
         <LoadingSpinner />
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
              <CardDescription>View, edit, or delete your recorded soil samples.</CardDescription>
            </CardHeader>
            <CardContent>
               {/* ✨ SoilDataTable now fetches its own data */}
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
               {/* ✨ SoilDataCharts now fetches its own data */}
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

    