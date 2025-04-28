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

// ✨ Firestore
import { db } from '@/lib/firebase'; // Ajustá esta ruta si tu firebase.ts está en otra carpeta
import { collection, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("addData");
  
  // ✨ Para guardar los datos de Firestore
  const [soilData, setSoilData] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  // ✨ Cargar datos de Firestore cuando el usuario esté listo
  useEffect(() => {
    if (!loading && user) {
      const fetchData = async () => {
        setFetchingData(true);
        try {
          const querySnapshot = await getDocs(collection(db, `users/${user.uid}/soilData`));
          const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSoilData(data);
        } catch (error) {
          console.error("Error fetching soil data:", error);
        }
        setFetchingData(false);
      };

      fetchData();
    } else if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || fetchingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
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
              {/* ✨ Le paso soilData a la tabla */}
              <SoilDataTable data={soilData} />
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
              <SoilDataCharts data={soilData} /> {/* ✨ También le paso soilData a los charts */}
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
