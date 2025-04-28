
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
import { AlertTriangle, MoreHorizontal, Pencil, Trash2, Calendar as CalendarIcon, MapPin, Globe, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SoilData } from '@/types/soil';
import { format, isValid } from 'date-fns';
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
   const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      // Ensure 'to' date includes the full current day for default view
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return {
        from: thirtyDaysAgo,
        to: endOfToday, // Default range includes today
      };
   });


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setSoilData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Ensure we are querying the correct path
    const dataPath = `users/${user.uid}/soilData`;
    console.log("SoilDataTable: Setting up listener for path:", dataPath); // Debug log

    const q = query(
      collection(db, dataPath),
      orderBy('date', 'desc') // Order by date descending for table view
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log(`SoilDataTable: Snapshot received: ${querySnapshot.size} documents.`); // Debug log
        const data: Array<SoilData & { id: string }> = [];
        querySnapshot.forEach((doc) => {
           const docData = doc.data();
            console.log(`SoilDataTable: Processing doc ${doc.id}:`, docData); // Debug log

           // Ensure the date field is a Firestore Timestamp before converting
           let date = docData.date;
           if (!(date instanceof Timestamp)) {
              console.warn(`SoilDataTable: Document ${doc.id} has non-Timestamp date:`, docData.date, typeof docData.date);
              // Attempt conversion ONLY if it's a recognizable format (e.g., ISO string)
              try {
                 const potentialDate = new Date(date);
                 if (isValid(potentialDate)) {
                    date = Timestamp.fromDate(potentialDate);
                    console.log(`SoilDataTable: Converted date for doc ${doc.id} to Timestamp:`, date); // Debug log
                 } else {
                    console.warn(`SoilDataTable: Document ${doc.id} has invalid date format, skipping.`);
                    return; // Skip this entry if date is fundamentally invalid
                 }
              } catch (e) {
                 console.error(`SoilDataTable: Error converting date for doc ${doc.id}:`, e);
                 return; // Skip on conversion error
              }
           }

           // Ensure required fields exist (add defaults if needed, though ideally they are saved)
           const entry: SoilData & { id: string } = {
                id: doc.id,
                userId: docData.userId || user.uid, // Ensure userId is present
                date: date, // Use the potentially converted Timestamp
                location: docData.location,
                locationOption: docData.locationOption ?? (docData.latitude ? 'gps' : (docData.location ? 'manual' : undefined)), // Infer if missing, handle undefined
                latitude: docData.latitude,
                longitude: docData.longitude,
                measurementType: docData.measurementType || 'vess', // Default if missing? Or skip? Let's assume it exists
                vessScore: docData.vessScore,
                sand: docData.sand,
                clay: docData.clay,
                silt: docData.silt,
                sandPercent: docData.sandPercent,
                clayPercent: docData.clayPercent,
                siltPercent: docData.siltPercent,
                privacy: docData.privacy || 'private', // Default if missing
            };

            // Validate basic structure before adding
            if (!entry.measurementType) {
                console.warn(`SoilDataTable: Document ${doc.id} missing measurementType, skipping.`);
                return;
            }
             if (!entry.date || !isValid(entry.date.toDate())) {
                 console.warn(`SoilDataTable: Document ${doc.id} has invalid date after processing, skipping.`);
                 return;
             }

           data.push(entry);
        });
        console.log("SoilDataTable: Processed data:", data); // Debug log
        setSoilData(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('SoilDataTable: Error fetching soil data:', err);
        setError('Failed to fetch soil data. Check console for details.');
        toast({
          variant: 'destructive',
          title: 'Error Loading Data',
          description: 'Could not load your soil data.',
        });
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
        console.log("SoilDataTable: Unsubscribing from Firestore listener."); // Debug log
        unsubscribe();
    };
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

    // Show loading state on button?
    setIsLoading(true); // Indicate loading during delete
    try {
      const docRef = doc(db, `users/${user.uid}/soilData`, selectedData.id);
      await deleteDoc(docRef);
      toast({ title: 'Success', description: 'Soil data entry deleted.' });
      setIsDeleteDialogOpen(false);
      setSelectedData(null);
    } catch (error: any) {
      console.error('SoilDataTable: Error deleting data:', error);
      toast({
        variant: 'destructive',
        title: 'Error Deleting Data',
        description: error.message || 'Could not delete entry. Please try again.',
      });
    } finally {
        setIsLoading(false); // Stop loading indicator
    }
  };

   const filteredData = useMemo(() => {
     console.log("SoilDataTable: Filtering data with date range:", dateRange, "Total items:", soilData.length); // Log start of filtering
     return soilData.filter(item => {
       // Add a check for item.date existence and type
       if (!item.date || !(item.date instanceof Timestamp)) {
          console.warn("SoilDataTable Filtering: Skipping item due to missing or non-Timestamp date:", item.id, item.date); // Debug log
         return false; // Skip items with invalid dates
       }
       const itemDate = item.date.toDate();
        if (!isValid(itemDate)) {
            console.warn("SoilDataTable Filtering: Skipping item due to invalid date after conversion:", item.id, itemDate); // Debug log
            return false; // Double check validity after conversion
        }

       const fromDate = dateRange?.from;
       const toDate = dateRange?.to;

       if (!fromDate && !toDate) {
            // console.log(`SoilDataTable Filtering: Item ID ${item.id}: No date range applied.`);
            return true; // No filter applied
       }

       // Set hours to ensure full day comparison
       const startOfDayFrom = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)) : null;
       const endOfDayTo = toDate ? new Date(toDate.setHours(23, 59, 59, 999)) : null;

       // console.log(`SoilDataTable Filtering: Item ID ${item.id}: Date ${itemDate.toISOString()}, Filter From: ${startOfDayFrom?.toISOString() ?? 'N/A'}, Filter To: ${endOfDayTo?.toISOString() ?? 'N/A'}`); // Detailed log

       const isAfterFrom = startOfDayFrom ? itemDate >= startOfDayFrom : true;
       const isBeforeTo = endOfDayTo ? itemDate <= endOfDayTo : true;

       const included = isAfterFrom && isBeforeTo;
       // console.log(`SoilDataTable Filtering: Item ID ${item.id}: isAfterFrom=${isAfterFrom}, isBeforeTo=${isBeforeTo}, Included=${included}`); // Result log

       return included;
     });
   }, [soilData, dateRange]);


   if (isLoading && soilData.length === 0) { // Show loading only initially or when refetching after error/empty
    return (
       <div className="flex justify-center items-center py-10">
         <LoadingSpinner />
         <p className="ml-2">Loading your soil data...</p>
       </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 rounded-md bg-destructive/10">
         <AlertTriangle className="h-5 w-5" />
         <div>
            <p className="font-semibold">Error Loading Data</p>
            <p>{error}</p>
         </div>
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
              className="w-full sm:w-[300px] justify-start text-left font-normal"
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
              onSelect={(newRange) => {
                 // If only 'from' is selected, keep 'to' as null/undefined for now
                 // If 'to' is selected, set its time to the end of the day
                 if (newRange?.to) {
                    newRange.to.setHours(23, 59, 59, 999);
                 }
                 setDateRange(newRange);
                 console.log("SoilDataTable: Date range selected:", newRange);
              }}
              numberOfMonths={2}
               disabled={(date) => date > new Date() || date < new Date("1900-01-01")} // Disable future dates and very old dates
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
             {isLoading && filteredData.length === 0 ? ( // Show loading indicator inside table if actively loading (not just initial)
                <TableRow>
                   <TableCell colSpan={6} className="h-24 text-center">
                      <LoadingSpinner />
                   </TableCell>
                </TableRow>
             ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {soilData.length === 0 ? 'No soil data found yet. Add your first sample!' : 'No soil data found for the selected date range.'}
                  </TableCell>
                </TableRow>
             ) : (
               filteredData.map((data) => (
                <TableRow key={data.id}>
                   <TableCell className="font-medium whitespace-nowrap">
                     {/* Check if date is valid before formatting */}
                     {data.date instanceof Timestamp && isValid(data.date.toDate()) ? format(data.date.toDate(), 'PP') : 'Invalid Date'}
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-1">
                        {data.locationOption === 'gps' && data.latitude && data.longitude ? (
                            <>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {/* Truncate coordinates for display */}
                                {`${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`}
                            </>
                        ) : data.locationOption === 'manual' && data.location ? (
                            <>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {data.location}
                            </>
                         ) : (
                            <span className="text-muted-foreground italic">N/A</span>
                         )}
                      </div>
                  </TableCell>
                  <TableCell className="capitalize">{data.measurementType}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {data.measurementType === 'vess' ? (
                      `VESS: ${data.vessScore ?? 'N/A'}` // Handle missing score
                    ) : (
                       // Prioritize percentages, fallback to raw cm, then N/A
                        (data.sandPercent != null || data.clayPercent != null || data.siltPercent != null)
                        ? `S:${data.sandPercent?.toFixed(0) ?? '--'}% | C:${data.clayPercent?.toFixed(0) ?? '--'}% | Si:${data.siltPercent?.toFixed(0) ?? '--'}%`
                        : (data.sand != null || data.clay != null || data.silt != null)
                            ? `S:${data.sand ?? '--'}cm | C:${data.clay ?? '--'}cm | Si:${data.silt ?? '--'}cm`
                            : 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                     <Badge variant={data.privacy === 'public' ? 'secondary' : 'outline'} className="capitalize flex items-center gap-1 w-fit">
                       {data.privacy === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                       {data.privacy}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         {/* Disable button slightly differently when row action is loading */}
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                          <span className="sr-only">Open menu</span>
                           {/* Consider showing a mini spinner here if needed */}
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(data)} disabled={isLoading}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteDialog(data)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isLoading}>
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
              Update the details for this soil sample recorded on {selectedData && selectedData.date instanceof Timestamp && isValid(selectedData.date.toDate()) ? format(selectedData.date.toDate(), 'PP') : 'N/A'}.
            </DialogDescription>
          </DialogHeader>
          {selectedData && (
             <SoilDataForm
                key={selectedData.id} // Ensure form re-renders with new initial data
                initialData={selectedData}
                onFormSubmit={() => {
                  setIsEditDialogOpen(false);
                  setSelectedData(null); // Clear selection after submit
                  // Toast is now handled within the form's submit logic
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
              This action cannot be undone. This will permanently delete the soil data entry dated <span className="font-semibold">{selectedData && selectedData.date instanceof Timestamp && isValid(selectedData.date.toDate()) ? format(selectedData.date.toDate(), 'PP') : 'N/A'}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? <LoadingSpinner size={16}/> : <Trash2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
