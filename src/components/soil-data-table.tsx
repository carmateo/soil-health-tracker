
'use client';

import React, { useMemo, useState } from 'react';
import type { SoilData } from '@/types/soil'; // Import the type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Calendar, TestTubeDiagonal, Sigma, Percent } from 'lucide-react'; // Use appropriate icons

interface SoilDataTableProps {
  data: Array<SoilData & { id: string }>;
}

const ITEMS_PER_PAGE = 10;

export function SoilDataTable({ data }: SoilDataTableProps) {
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vess' | 'composition'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Ensure data is always an array, even if null/undefined initially
  const validData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const filteredData = useMemo(() => {
    console.log("SoilDataTable Filtering: Input data:", validData); // Debug: Log input data
    return validData.filter((entry) => {
      // Location filter (check both manual location and coords if GPS)
      const locationMatch = filterLocation === '' ||
        (entry.locationOption === 'manual' && entry.location?.toLowerCase().includes(filterLocation.toLowerCase())) ||
        (entry.locationOption === 'gps' && `GPS: ${entry.latitude?.toFixed(2)}, ${entry.longitude?.toFixed(2)}`.toLowerCase().includes(filterLocation.toLowerCase()));

      // Type filter
      const typeMatch = filterType === 'all' || entry.measurementType === filterType;

      return locationMatch && typeMatch;
    });
  }, [filterLocation, filterType, validData]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Handle page changes
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

   console.log("SoilDataTable: Rendering table with paginated data:", paginatedData); // Debug: Log data being rendered

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filtering Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input
            type="text"
            placeholder="Filter by Location/GPS..."
            value={filterLocation}
            onChange={(e) => { setFilterLocation(e.target.value); setCurrentPage(1); }} // Reset page on filter change
            className="max-w-xs flex-grow"
          />
          <Select
            value={filterType}
            onValueChange={(value: 'all' | 'vess' | 'composition') => { setFilterType(value); setCurrentPage(1); }} // Reset page on filter change
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
                 <TableHead className="w-[120px]"> <Calendar className="inline-block mr-1 h-4 w-4" /> Date</TableHead>
                 <TableHead> <MapPin className="inline-block mr-1 h-4 w-4" /> Location</TableHead>
                 <TableHead className="w-[100px]">Type</TableHead>
                 <TableHead className="text-center w-[100px]">VESS</TableHead>
                 <TableHead className="text-center w-[100px]"><Tooltip><TooltipTrigger>Sand</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[100px]"><Tooltip><TooltipTrigger>Clay</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[100px]"><Tooltip><TooltipTrigger>Silt</TooltipTrigger><TooltipContent><p>Value (cm) / Percent (%)</p></TooltipContent></Tooltip></TableHead>
                 <TableHead className="text-center w-[80px]">👁️‍🗨️</TableHead>
                 {/* Add Actions column if needed */}
                 {/* <TableHead className="text-right w-[100px]">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                    {validData.length > 0 ? 'No results match your filters.' : 'No data recorded yet. Go to "Add Data" to start.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                       {entry.date && isValid(entry.date.toDate())
                          ? format(entry.date.toDate(), 'PP') // Format date nicely (e.g., Mar 17, 2024)
                         : 'Invalid Date'}
                     </TableCell>
                    <TableCell>
                      {entry.locationOption === 'manual' ? (
                        entry.location || 'N/A'
                      ) : entry.locationOption === 'gps' && entry.latitude !== undefined ? (
                          <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                 GPS Coords
                             </TooltipTrigger>
                             <TooltipContent>
                                 <p>Lat: {entry.latitude.toFixed(5)}</p>
                                 <p>Lon: {entry.longitude?.toFixed(5)}</p>
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
                     {/* Composition Data - Show value and percentage */}
                     {['sand', 'clay', 'silt'].map((comp) => (
                       <TableCell key={comp} className="text-center">
                         {entry.measurementType === 'composition' ? (
                           entry[comp as keyof SoilData] !== undefined ? (
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
                     <TableCell className="text-center">{entry.privacy === 'public' ? '🌍' : '🔒'}</TableCell>
                     {/* Add Actions Cell if needed */}
                     {/* <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                     </TableCell> */}
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
