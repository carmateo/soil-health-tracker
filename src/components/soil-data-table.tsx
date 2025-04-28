'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { useAuth } from '@/context/auth-context';
import { collection, query, where, onSnapshot, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, MoreHorizontal, Pencil, Trash2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SoilData } from '@/types/soil';
import { format } from 'date-fns';
import { LoadingSpinner } from './loading-spinner';
import { SoilDataForm } from './soil-data-form'; // Import the form for editing
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { subDays } from 'date-fns';


export function SoilDataTable() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [soilData, setSoilData] = useState<Array<SoilData & { id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<(SoilData & { id: string }) | null>(null);
   const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), // Default to last 30 days
    to: new Date(),
  });


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setSoilData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, `users/${user.uid}/soilData`),
      orderBy('date', 'desc') // Order by date descending
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as SoilData & { id: string });
        });
        setSoilData(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching soil data:', err);
        setError('Failed to fetch soil data. Please try again later.');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load your soil data.',
        });
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user, db, toast]);


  const openEditDialog = (data: SoilData & { id: string }) => {
    setSelectedData(data);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (data: SoilData & { id: string }) => {
    setSelectedData(data);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedData || !user) return;

    try {
      const docRef = doc(db, `users/${user.uid}/soilData`, selectedData.id);
      await deleteDoc(docRef);
      toast({ title: 'Success', description: 'Soil data entry deleted.' });
      setIsDeleteDialogOpen(false);
      setSelectedData(null);
    } catch (error: any) {
      console.error('Error deleting data:', error);
      toast({
        variant: 'destructive',
        title: 'Error Deleting Data',
        description: error.message || 'Could not delete entry. Please try again.',
      });
    }
  };

   const filteredData = useMemo(() => {
    return soilData.filter(item => {
      const itemDate = item.date.toDate();
      const fromDate = dateRange?.from;
      const toDate = dateRange?.to;

      if (!fromDate && !toDate) return true; // No filter applied

      const isAfterFrom = fromDate ? itemDate >= fromDate : true;
      // Adjust 'to' date to include the entire day
      const isBeforeTo = toDate ? itemDate <= new Date(toDate.setHours(23, 59, 59, 999)) : true;

      return isAfterFrom && isBeforeTo;
    });
  }, [soilData, dateRange]);


   if (isLoading) {
    return (
       <div className="flex justify-center items-center py-10">
         <LoadingSpinner />
         <p className="ml-2">Loading your soil data...</p>
       </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center gap-2">
         <AlertTriangle /> {error}
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
       <div className="flex justify-end mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className="w-[300px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
               disabled={(date) => date > new Date()} // Disable future dates
            />
          </PopoverContent>
        </Popover>
       </div>


       <div className="rounded-md border shadow-sm bg-card">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Date</TableHead>
               <TableHead>Location</TableHead>
               <TableHead>Type</TableHead>
               <TableHead>Value(s)</TableHead>
               <TableHead>Privacy</TableHead>
               <TableHead className="text-right">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No soil data found {dateRange?.from || dateRange?.to ? 'for the selected date range.' : 'yet. Add your first sample!'}
                  </TableCell>
                </TableRow>
             ) : (
               filteredData.map((data) => (
                <TableRow key={data.id}>
                  <TableCell className="font-medium">
                    {format(data.date.toDate(), 'PP')} {/* Format date nicely */}
                  </TableCell>
                   <TableCell>
                    {data.location || (data.latitude && data.longitude ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` : <span className="text-muted-foreground italic">N/A</span>)}
                  </TableCell>
                  <TableCell className="capitalize">{data.measurementType}</TableCell>
                  <TableCell>
                    {data.measurementType === 'vess' ? (
                      `VESS: ${data.vessScore}`
                    ) : (
                      `Sand: ${data.sandPercent ?? data.sand ?? 'N/A'}% | Clay: ${data.clayPercent ?? data.clay ?? 'N/A'}% | Silt: ${data.siltPercent ?? data.silt ?? 'N/A'}%`

                    )}
                  </TableCell>
                  <TableCell>
                     <Badge variant={data.privacy === 'public' ? 'secondary' : 'outline'} className="capitalize">
                       {data.privacy}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(data)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteDialog(data)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                           <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
             )}
           </TableBody>
         </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-secondary">
          <DialogHeader>
            <DialogTitle>Edit Soil Data Entry</DialogTitle>
            <DialogDescription>
              Update the details for this soil sample.
            </DialogDescription>
          </DialogHeader>
          {selectedData && (
             <SoilDataForm
                key={selectedData.id} // Ensure form re-renders with new initial data
                initialData={selectedData}
                onFormSubmit={() => {
                  setIsEditDialogOpen(false);
                  setSelectedData(null); // Clear selection after submit
                }}
             />
          )}
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the soil data entry dated <span className="font-semibold">{selectedData ? format(selectedData.date.toDate(), 'PP') : ''}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
