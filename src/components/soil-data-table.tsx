
'use client';

import React, { useMemo, useState } from 'react';
import type { SoilData } from '@/types/soil'; // Import the type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Calendar, TestTubeDiagonal, Sigma, Percent, Edit, Trash2, AlertTriangle, Globe, Lock, User } from 'lucide-react'; // Added User icon
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';


interface SoilDataTableProps {
  data: Array<SoilData & { id: string }>;
  onEdit: (entry: SoilData & { id: string }) => void;
  onDelete: (entryId: string) => Promise<void>;
  showActions?: boolean; // New optional prop to control action buttons visibility
}

const ITEMS_PER_PAGE = 10;

export function SoilDataTable({ data, onEdit, onDelete, showActions = true }: SoilDataTableProps) { // Default showActions to true
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vess' | 'composition'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();


  const validData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const filteredData = useMemo(() => {
    console.log("SoilDataTable Filtering: Input data:", validData);
    return validData.filter((entry) => {
       const locationString = entry.locationOption === 'manual'
         ? entry.location?.toLowerCase() ?? ''
         : [
             entry.latitude?.toFixed(4),
             entry.longitude?.toFixed(4),
             entry.city?.toLowerCase(),
             entry.region?.toLowerCase(),
             entry.country?.toLowerCase(),
           ].filter(Boolean).join(', ').toLowerCase();

      const locationMatch = filterLocation === '' || locationString.includes(filterLocation.toLowerCase());
      const typeMatch = filterType === 'all' || entry.measurementType === filterType;

      return locationMatch && typeMatch;
    });
  }, [filterLocation, filterType, validData]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleDeleteConfirm = async (entryId: string) => {
     setIsDeleting(entryId);
     try {
       await onDelete(entryId);
       toast({ title: "Entry Deleted", description: "The soil data entry has been removed." });
       if (paginatedData.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
       }
     } catch (error) {
       console.error("Error deleting entry:", error);
       toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the entry. Please try again." });
     } finally {
        setIsDeleting(null);
     }
  };


   console.log("SoilDataTable: Rendering table with paginated data:", paginatedData);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filtering Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input
            type="text"
            placeholder="Filter by Location/GPS/Region..."
            value={filterLocation}
            onChange={(e) => { setFilterLocation(e.target.value); setCurrentPage(1); }}
            className="max-w-xs flex-grow"
          />
          <Select
            value={filterType}
            onValueChange={(value: 'all' | 'vess' | 'composition') => { setFilterType(value); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vess">VESS Score</SelectItem>
              <SelectItem value="composition">Composition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-md border shadow-sm">
          <Table>
            <TableCaption>
                {filteredData.length === 0 ? 'No soil data entries found.' : `Showing ${paginatedData.length} of ${filteredData.length} entries.`}
             </TableCaption>
            <TableHeader>
              <TableRow>
                 {/* Add User column only if actions are hidden (i.e., public view) */}
                 {!showActions && <TableHead className="w-[100px]"><User className="inline-block mr-1 h-4 w-4" /> User</TableHead>}
                 <TableHead className="w-[120px]"> <Calendar className="inline-block mr-1 h-4 w-4" /> Date</TableHead>
                 <TableHead> <MapPin className="inline-block mr-1 h-4 w-4" /> Location</TableHead>
                 <TableHead className="w-[100px]">Type</TableHead>
                 <TableHead className="text-center w-[80px]">VESS</TableHead>
                 <TableHead className="text-center w-[90px]"><Tooltip><TooltipTrigger>Sand</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[90px]"><Tooltip><TooltipTrigger>Clay</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[90px]"><Tooltip><TooltipTrigger>Silt</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[60px]">Privacy</TableHead>
                 {/* Conditionally render Actions column */}
                 {showActions && <TableHead className="text-center w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 9 : 9} className="text-center h-24 text-muted-foreground"> {/* Adjust colSpan */}
                    {validData.length > 0 ? 'No results match your filters.' : 'No data recorded yet. Go to "Add Data" to start.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((entry) => (
                  <TableRow key={entry.id}>
                     {/* Conditionally render User ID cell */}
                     {!showActions && (
                        <TableCell>
                           <Tooltip>
                               <TooltipTrigger className="cursor-help">
                                 {entry.userId ? `${entry.userId.substring(0, 6)}...` : 'Unknown'}
                               </TooltipTrigger>
                               <TooltipContent><p>User ID: {entry.userId}</p></TooltipContent>
                           </Tooltip>
                        </TableCell>
                     )}
                    <TableCell>
                       {entry.date && isValid(entry.date.toDate())
                          ? format(entry.date.toDate(), 'PP')
                         : 'Invalid Date'}
                     </TableCell>
                    <TableCell>
                      {entry.locationOption === 'manual' ? (
                        entry.location || 'N/A'
                      ) : entry.locationOption === 'gps' && entry.latitude != null && entry.longitude != null ? (
                          <Tooltip>
                              <TooltipTrigger className="cursor-help text-left">
                                 {(() => {
                                    const coordString = `Lat: ${entry.latitude.toFixed(4)}, Lon: ${entry.longitude.toFixed(4)}`;
                                    const detailsArray = [entry.city, entry.region, entry.country].filter(detail => detail && detail.trim() !== '');
                                    const detailsString = detailsArray.join(', ');
                                    return detailsString ? `${coordString} (${detailsString})` : coordString;
                                 })()}
                             </TooltipTrigger>
                             <TooltipContent>
                                 <p>Lat: {entry.latitude.toFixed(5)}</p>
                                 <p>Lon: {entry.longitude.toFixed(5)}</p>
                                 {entry.city && <p>City: {entry.city}</p>}
                                 {entry.region && <p>Region: {entry.region}</p>}
                                 {entry.country && <p>Country: {entry.country}</p>}
                             </TooltipContent>
                         </Tooltip>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                       {entry.measurementType === 'vess' ? (
                         <span className="flex items-center gap-1"><TestTubeDiagonal className="h-4 w-4 text-blue-500"/> VESS</span>
                       ) : (
                         <span className="flex items-center gap-1"><Sigma className="h-4 w-4 text-green-600"/> Comp.</span>
                       )}
                    </TableCell>
                    <TableCell className="text-center">
                       {entry.measurementType === 'vess' ? entry.vessScore ?? '-' : '-'}
                     </TableCell>
                     {['sand', 'clay', 'silt'].map((comp) => (
                       <TableCell key={comp} className="text-center">
                         {entry.measurementType === 'composition' ? (
                           entry[comp as keyof SoilData] !== null && entry[comp as keyof SoilData] !== undefined ? (
                             <Tooltip>
                               <TooltipTrigger className="cursor-help">
                                 {entry[comp as keyof SoilData]} <span className="text-xs text-muted-foreground">cm</span>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <p>{entry[`${comp}Percent` as keyof SoilData] ?? '--'}%</p>
                               </TooltipContent>
                             </Tooltip>
                           ) : '-'
                         ) : '-'}
                       </TableCell>
                     ))}
                     <TableCell className="text-center">
                        <Tooltip>
                            <TooltipTrigger>
                                {entry.privacy === 'public' ? <Globe className="h-4 w-4 text-green-600 mx-auto" /> : <Lock className="h-4 w-4 text-red-600 mx-auto" />}
                             </TooltipTrigger>
                             <TooltipContent>
                                <p>{entry.privacy === 'public' ? 'Public' : 'Private'}</p>
                             </TooltipContent>
                         </Tooltip>
                     </TableCell>
                     {/* Conditionally render Actions Cell */}
                     {showActions && (
                        <TableCell className="text-center">
                            <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} className="hover:text-primary" aria-label="Edit">
                                     <Edit className="h-4 w-4" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>Edit Entry</p></TooltipContent>
                            </Tooltip>

                             <AlertDialog>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label="Delete" disabled={isDeleting === entry.id}>
                                          {isDeleting === entry.id ? <Trash2 className="h-4 w-4 animate-pulse" /> : <Trash2 className="h-4 w-4" />}
                                      </Button>
                                   </AlertDialogTrigger>
                                  </TooltipTrigger>
                                 <TooltipContent><p>Delete Entry</p></TooltipContent>
                               </Tooltip>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     This action cannot be undone. This will permanently delete the soil data entry recorded on <span className="font-semibold">{entry.date && isValid(entry.date.toDate()) ? format(entry.date.toDate(), 'PP') : 'Invalid Date'}</span>.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel disabled={isDeleting === entry.id}>Cancel</AlertDialogCancel>
                                   <AlertDialogAction
                                      onClick={() => handleDeleteConfirm(entry.id)}
                                      disabled={isDeleting === entry.id}
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                     {isDeleting === entry.id ? 'Deleting...' : 'Yes, delete'}
                                   </AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                         </TableCell>
                      )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
           <div className="flex items-center justify-end space-x-2 pt-4">
             <Button
               variant="outline"
               size="sm"
               onClick={() => goToPage(currentPage - 1)}
               disabled={currentPage === 1}
             >
               Previous
             </Button>
             <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
             </span>
             <Button
               variant="outline"
               size="sm"
               onClick={() => goToPage(currentPage + 1)}
               disabled={currentPage === totalPages}
             >
               Next
             </Button>
           </div>
         )}
      </div>
    </TooltipProvider>
  );
}

    