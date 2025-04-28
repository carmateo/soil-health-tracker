
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
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      console.log("SoilDataTable: Initializing date range:", { from: thirtyDaysAgo, to: endOfToday });
      return {
        from: thirtyDaysAgo,
        to: endOfToday,
      };
   });


  useEffect(() => {
    // Add a small delay to ensure user context is potentially settled
    const timer = setTimeout(() => {
        if (!user) {
           console.log("SoilDataTable Effect: No user found after delay, skipping fetch.");
          setIsLoading(false);
          setSoilData([]); // Explicitly clear data if no user
          setError(null); // Clear any previous error
          return;
        }

        setIsLoading(true);
        setError(null);

        const dataPath = `users/${user.uid}/soilData`;
        console.log(`SoilDataTable Effect: User found (UID: ${user.uid}). Setting up listener for path: ${dataPath}`);

        const q = query(
          collection(db, dataPath),
          orderBy('date', 'desc') // Order by date descending for table view
        );

        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`SoilDataTable Snapshot Received: ${querySnapshot.size} documents. Is empty? ${querySnapshot.empty}`);
             if (querySnapshot.metadata.hasPendingWrites) {
               console.log("SoilDataTable Snapshot: Data has local writes, waiting for server confirmation potentially.");
             }

            const rawDocsData: any[] = [];
            const processedData: Array<SoilData & { id: string }> = [];
            querySnapshot.forEach((doc, index) => {
               const docData = doc.data();
               rawDocsData.push({ id: doc.id, ...docData }); // Log raw data first
               // console.log(`SoilDataTable Snapshot: Processing doc ${index + 1}/${querySnapshot.size} (ID: ${doc.id}):`, docData);

               let date = docData.date;
               let dateValid = false;
               if (date instanceof Timestamp) {
                    const jsDate = date.toDate();
                    if (isValid(jsDate)) {
                        dateValid = true;
                    } else {
                        console.warn(`SoilDataTable Snapshot: Doc ${doc.id} has Timestamp but it converts to invalid JSDate.`);
                    }
               } else {
                  console.warn(`SoilDataTable Snapshot: Doc ${doc.id} has non-Timestamp date:`, docData.date, typeof docData.date);
                  // Attempt conversion only if needed
                  try {
                      const potentialDate = new Date(date); // Attempt to parse whatever it is
                      if (isValid(potentialDate)) {
                          date = Timestamp.fromDate(potentialDate); // Convert to Timestamp if parseable
                          dateValid = true;
                          console.log(`SoilDataTable Snapshot: Converted non-Timestamp date for doc ${doc.id} to Timestamp:`, date);
                      } else {
                          console.warn(`SoilDataTable Snapshot: Doc ${doc.id} has non-Timestamp, non-parseable date, skipping.`);
                          return; // Skip this doc if date is completely unusable
                      }
                  } catch (e) {
                      console.error(`SoilDataTable Snapshot: Error converting date for doc ${doc.id}:`, e);
                      return; // Skip on error
                  }
               }

               if (!dateValid) {
                   console.warn(`SoilDataTable Snapshot: Doc ${doc.id} has invalid date after all checks, skipping.`);
                   return; // Skip if date is ultimately invalid
               }

               if (!docData.measurementType) {
                   console.warn(`SoilDataTable Snapshot: Document ${doc.id} missing measurementType, skipping.`);
                   return;
               }

               const entry: SoilData & { id: string } = {
                    id: doc.id,
                    userId: docData.userId || user.uid,
                    date: date, // Use the validated/converted Timestamp
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
                };
                processedData.push(entry);
                // console.log(`SoilDataTable Snapshot: Pushed entry ${index + 1}/${querySnapshot.size} (ID: ${doc.id}):`, entry);
            });
            console.log("SoilDataTable Snapshot: Raw documents data:", rawDocsData); // Log all raw data fetched
            console.log("SoilDataTable Snapshot: Finished processing. Processed data count:", processedData.length);
            setSoilData(processedData);
            setIsLoading(false);
            setError(null); // Clear error on successful fetch
          },
          (err) => {
            console.error('SoilDataTable Snapshot Error:', err);
            setError(`Failed to fetch soil data: ${err.message}. Check console.`);
            toast({
              variant: 'destructive',
              title: 'Error Loading Data',
              description: 'Could not load your soil data. Please check your connection or try again later.',
            });
            setIsLoading(false);
            setSoilData([]); // Clear data on error
          }
        );

        // Cleanup subscription on unmount
        return () => {
            console.log("SoilDataTable Effect Cleanup: Unsubscribing from Firestore listener for path:", dataPath);
            unsubscribe();
        };
    }, 100); // 100ms delay

    return () => clearTimeout(timer); // Clear timer on unmount

  }, [user, db, toast]); // Rerun when user, db instance, or toast changes


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

   // Filter logic with extensive logging
   const filteredData = useMemo(() => {
       console.log("SoilDataTable Filtering: Starting filter calculation.");
       console.log("SoilDataTable Filtering: Current soilData state:", soilData);
       console.log("SoilDataTable Filtering: Current dateRange state:", dateRange);

       if (!Array.isArray(soilData)) {
           console.error("SoilDataTable Filtering: soilData is not an array!", soilData);
           return [];
       }

       const filtered = soilData.filter((item, index) => {
           // console.log(`SoilDataTable Filtering: Checking item ${index + 1}/${soilData.length} (ID: ${item.id})`);

           if (!item.date || !(item.date instanceof Timestamp)) {
               console.warn(`SoilDataTable Filtering: Item ID ${item.id} skipped - missing or non-Timestamp date:`, item.date);
               return false;
           }
           const itemDate = item.date.toDate();
           if (!isValid(itemDate)) {
               console.warn(`SoilDataTable Filtering: Item ID ${item.id} skipped - invalid JS date after conversion:`, itemDate);
               return false;
           }

           const fromDate = dateRange?.from;
           const toDate = dateRange?.to;

            // console.log(`SoilDataTable Filtering: Item ID ${item.id}: Item Date: ${itemDate.toISOString()}`);

           // If no date range is set, include all valid items
           if (!fromDate && !toDate) {
                // console.log(`SoilDataTable Filtering: Item ID ${item.id}: Included (no date range filter).`);
                return true;
           }

           // Adjust range for full day comparison
           const startOfDayFrom = fromDate ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0) : null;
           const endOfDayTo = toDate ? new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999) : null;

           // console.log(`SoilDataTable Filtering: Item ID ${item.id}: Filter From: ${startOfDayFrom?.toISOString() ?? 'N/A'}, Filter To: ${endOfDayTo?.toISOString() ?? 'N/A'}`);

           const isAfterFrom = startOfDayFrom ? itemDate >= startOfDayFrom : true;
           const isBeforeTo = endOfDayTo ? itemDate <= endOfDayTo : true;

           const included = isAfterFrom && isBeforeTo;
           // console.log(`SoilDataTable Filtering: Item ID ${item.id}: isAfterFrom=${isAfterFrom}, isBeforeTo=${isBeforeTo}. Included=${included}`);
           return included;
       });

       console.log("SoilDataTable Filtering: Filtering complete. Filtered data length:", filtered.length);
       console.log("SoilDataTable Filtering: Filtered data:", filtered);
       return filtered;
   }, [soilData, dateRange]);


   if (isLoading && soilData.length === 0) {
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

  // This case means fetching finished (isLoading=false), there's no error, but soilData is empty.
  // We handle the specific message within the table body now.


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
                 const updatedRange = { ...newRange };
                 if (updatedRange?.to) {
                    updatedRange.to = new Date(updatedRange.to.getFullYear(), updatedRange.to.getMonth(), updatedRange.to.getDate(), 23, 59, 59, 999);
                 }
                 setDateRange(updatedRange);
                 console.log("SoilDataTable: Date range selected via Calendar:", updatedRange);
              }}
              numberOfMonths={2}
               disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
             {isLoading ? ( // Show loading only when actively fetching
                <TableRow>
                   <TableCell colSpan={6} className="h-24 text-center">
                      <LoadingSpinner />
                      <p className="mt-2 text-muted-foreground">Loading data...</p>
                   </TableCell>
                </TableRow>
             ) : filteredData.length === 0 ? ( // Explicitly check filtered data length *after* loading is false
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {soilData.length === 0 ? 'No soil data entries found. Add your first sample using the "Add Data" tab.' : 'No data matches the selected date range. Try adjusting the dates.'}
                  </TableCell>
                </TableRow>
             ) : (
               filteredData.map((data, index) => ( // Log mapping
                 <TableRow key={data.id}>
                   <TableCell className="font-medium whitespace-nowrap">
                     {/* Already validated date in effect/filter */}
                     {format(data.date.toDate(), 'PP')}
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-1">
                        {data.locationOption === 'gps' && data.latitude && data.longitude ? (
                            <>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
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
                      `VESS: ${data.vessScore ?? 'N/A'}`
                    ) : (
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
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                          <span className="sr-only">Open menu</span>
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
