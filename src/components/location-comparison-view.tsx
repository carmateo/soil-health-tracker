
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFirebase } from '@/context/firebase-context';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import type { SoilData } from '@/types/soil';
import { getLocationKeyAndName, getUniqueLocations } from '@/lib/location-utils';
import { calculateSoilProperties } from '@/lib/soil-calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { AlertTriangle, MapPin, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { RadarChartComparison } from '@/components/radar-chart-comparison';
import type { LocationDataType } from '@/components/radar-chart-comparison';


const countriesList = [
  { value: 'AF', label: 'Afghanistan' },
  { value: 'AL', label: 'Albania' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'AD', label: 'Andorra' },
  { value: 'AO', label: 'Angola' },
  { value: 'AG', label: 'Antigua and Barbuda' },
  { value: 'AR', label: 'Argentina' },
  { value: 'AM', label: 'Armenia' },
  { value: 'AU', label: 'Australia' },
  { value: 'AT', label: 'Austria' },
  { value: 'AZ', label: 'Azerbaijan' },
  { value: 'BS', label: 'Bahamas' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'BB', label: 'Barbados' },
  { value: 'BY', label: 'Belarus' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BZ', label: 'Belize' },
  { value: 'BJ', label: 'Benin' },
  { value: 'BT', label: 'Bhutan' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BA', label: 'Bosnia and Herzegovina' },
  { value: 'BW', label: 'Botswana' },
  { value: 'BR', label: 'Brazil' },
  { value: 'BN', label: 'Brunei Darussalam' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'BI', label: 'Burundi' },
  { value: 'CV', label: 'Cabo Verde' },
  { value: 'KH', label: 'Cambodia' },
  { value: 'CM', label: 'Cameroon' },
  { value: 'CA', label: 'Canada' },
  { value: 'CF', label: 'Central African Republic' },
  { value: 'TD', label: 'Chad' },
  { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' },
  { value: 'CO', label: 'Colombia' },
  { value: 'KM', label: 'Comoros' },
  { value: 'CG', label: 'Congo' },
  { value: 'CD', label: 'Congo (Democratic Republic of the)' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CU', label: 'Cuba' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'DK', label: 'Denmark' },
  { value: 'DJ', label: 'Djibouti' },
  { value: 'DM', label: 'Dominica' },
  { value: 'DO', label: 'Dominican Republic' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'EG', label: 'Egypt' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'GQ', label: 'Equatorial Guinea' },
  { value: 'ER', label: 'Eritrea' },
  { value: 'EE', label: 'Estonia' },
  { value: 'SZ', label: 'Eswatini' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'FJ', label: 'Fiji' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'GA', label: 'Gabon' },
  { value: 'GM', label: 'Gambia' },
  { value: 'GE', label: 'Georgia' },
  { value: 'DE', label: 'Germany' },
  { value: 'GH', label: 'Ghana' },
  { value: 'GR', label: 'Greece' },
  { value: 'GD', label: 'Grenada' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'GN', label: 'Guinea' },
  { value: 'GW', label: 'Guinea-Bissau' },
  { value: 'GY', label: 'Guyana' },
  { value: 'HT', label: 'Haiti' },
  { value: 'HN', label: 'Honduras' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IS', label: 'Iceland' },
  { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'IR', label: 'Iran' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IL', label: 'Israel' },
  { value: 'IT', label: 'Italy' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'JP', label: 'Japan' },
  { value: 'JO', label: 'Jordan' },
  { value: 'KZ', label: 'Kazakhstan' },
  { value: 'KE', label: 'Kenya' },
  { value: 'KI', label: 'Kiribati' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'KG', label: 'Kyrgyzstan' },
  { value: 'LA', label: "Lao People's Democratic Republic" },
  { value: 'LV', label: 'Latvia' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'LS', label: 'Lesotho' },
  { value: 'LR', label: 'Liberia' },
  { value: 'LY', label: 'Libya' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'MW', label: 'Malawi' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'MV', label: 'Maldives' },
  { value: 'ML', label: 'Mali' },
  { value: 'MT', label: 'Malta' },
  { value: 'MH', label: 'Marshall Islands' },
  { value: 'MR', label: 'Mauritania' },
  { value: 'MU', label: 'Mauritius' },
  { value: 'MX', label: 'Mexico' },
  { value: 'FM', label: 'Micronesia (Federated States of)' },
  { value: 'MD', label: 'Moldova' },
  { value: 'MC', label: 'Monaco' },
  { value: 'MN', label: 'Mongolia' },
  { value: 'ME', label: 'Montenegro' },
  { value: 'MA', label: 'Morocco' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'MM', label: 'Myanmar' },
  { value: 'NA', label: 'Namibia' },
  { value: 'NR', label: 'Nauru' },
  { value: 'NP', label: 'Nepal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'NE', label: 'Niger' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KP', label: 'North Korea' },
  { value: 'MK', label: 'North Macedonia' },
  { value: 'NO', label: 'Norway' },
  { value: 'OM', label: 'Oman' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'PW', label: 'Palau' },
  { value: 'PA', label: 'Panama' },
  { value: 'PG', label: 'Papua New Guinea' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Peru' },
  { value: 'PH', label: 'Philippines' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'QA', label: 'Qatar' },
  { value: 'RO', label: 'Romania' },
  { value: 'RU', label: 'Russian Federation' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'KN', label: 'Saint Kitts and Nevis' },
  { value: 'LC', label: 'Saint Lucia' },
  { value: 'VC', label: 'Saint Vincent and the Grenadines' },
  { value: 'WS', label: 'Samoa' },
  { value: 'SM', label: 'San Marino' },
  { value: 'ST', label: 'Sao Tome and Principe' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'SN', label: 'Senegal' },
  { value: 'RS', label: 'Serbia' },
  { value: 'SC', label: 'Seychelles' },
  { value: 'SL', label: 'Sierra Leone' },
  { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'SB', label: 'Solomon Islands' },
  { value: 'SO', label: 'Somalia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'KR', label: 'South Korea' },
  { value: 'SS', label: 'South Sudan' },
  { value: 'ES', label: 'Spain' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'SD', label: 'Sudan' },
  { value: 'SR', label: 'Suriname' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SY', label: 'Syrian Arab Republic' },
  { value: 'TJ', label: 'Tajikistan' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'TH', label: 'Thailand' },
  { value: 'TL', label: 'Timor-Leste' },
  { value: 'TG', label: 'Togo' },
  { value: 'TO', label: 'Tonga' },
  { value: 'TT', label: 'Trinidad and Tobago' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TM', label: 'Turkmenistan' },
  { value: 'TV', label: 'Tuvalu' },
  { value: 'UG', label: 'Uganda' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States of America' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'UZ', label: 'Uzbekistan' },
  { value: 'VU', label: 'Vanuatu' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'VN', label: 'Viet Nam' },
  { value: 'YE', label: 'Yemen' },
  { value: 'ZM', label: 'Zambia' },
  { value: 'ZW', label: 'Zimbabwe' },
];


export function LocationComparisonView() {
  const { user } = useAuth();
  const { db } = useFirebase();
  const [userSoilData, setUserSoilData] = useState<Array<SoilData & { id: string }>>([]);
  const [loadingUserSoilData, setLoadingUserSoilData] = useState(true);
  const [errorUserSoilData, setErrorUserSoilData] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedUserLocationKey, setSelectedUserLocationKey] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    if (user && db) {
      setLoadingUserSoilData(true);
      setErrorUserSoilData(null);
      const dataPath = `users/${user.uid}/soilData`;
      const q = query(collection(db, dataPath), orderBy('date', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const fetchedData: Array<SoilData & { id: string }> = [];
          querySnapshot.forEach((doc) => {
            const docData = doc.data();
            let date = docData.date;
            if (!(date instanceof Timestamp)) {
                try {
                    let potentialDate;
                    if (typeof docData.date === 'object' && docData.date !== null && 'seconds' in docData.date) {
                        potentialDate = new Timestamp(docData.date.seconds, docData.date.nanoseconds || 0).toDate();
                    } else {
                        potentialDate = new Date(docData.date);
                    }
                    date = Timestamp.fromDate(potentialDate);
                } catch (e) { return; } 
            }
            if (!docData.measurementType) return; 

            fetchedData.push({ ...docData, id: doc.id, date } as SoilData & { id: string });
          });
          setUserSoilData(fetchedData);
          setLoadingUserSoilData(false);
        },
        (error) => {
          console.error("Error fetching user soil data for comparison:", error);
          setErrorUserSoilData("Failed to load your soil data.");
          setLoadingUserSoilData(false);
        }
      );
    } else {
      setUserSoilData([]);
      setLoadingUserSoilData(false);
    }
    return () => unsubscribe();
  }, [user, db]);

  const userLocations = useMemo(() => {
    if (!user || userSoilData.length === 0) return [];
    return getUniqueLocations(userSoilData);
  }, [userSoilData, user]);

  const selectedLocationSoilData: LocationDataType | null = useMemo(() => {
    if (!selectedUserLocationKey || !userSoilData.length) return null;

    const entriesForLocation = userSoilData.filter(
      (entry) => getLocationKeyAndName(entry).key === selectedUserLocationKey
    );

    if (!entriesForLocation.length) return null;

    // Get the most recent entry for this location, regardless of type
    const latestEntry = entriesForLocation.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())[0];

    if (!latestEntry) return null;

    // Construct the object to be passed to RadarChartComparison.
    // It should include all fields from SoilData and id, plus an optional tawPercent.
    // Initialize all specific metrics to null first.
    const returnData: LocationDataType = {
      ...latestEntry, // Spread all properties from latestEntry
      id: latestEntry.id, // Ensure id is present
      // Explicitly set metrics based on measurementType, others will be null
      vessScore: null,
      sandPercent: null,
      clayPercent: null,
      siltPercent: null,
      tawPercent: null, // Initialize TAW, will be calculated if applicable
    };

    if (latestEntry.measurementType === 'vess') {
      returnData.vessScore = latestEntry.vessScore ?? null;
    } else if (latestEntry.measurementType === 'composition') {
      returnData.sandPercent = latestEntry.sandPercent ?? null;
      returnData.clayPercent = latestEntry.clayPercent ?? null;
      returnData.siltPercent = latestEntry.siltPercent ?? null;
      
      let calculatedTaw: number | null = null;
      // Ensure clayPercent and sandPercent are valid numbers before calculation
      if (typeof latestEntry.clayPercent === 'number' && typeof latestEntry.sandPercent === 'number') {
        const properties = calculateSoilProperties(latestEntry.clayPercent, latestEntry.sandPercent);
        if (properties && typeof properties.availableWater === 'number') {
          calculatedTaw = properties.availableWater;
        }
      }
      returnData.tawPercent = calculatedTaw;
    }
    
    return returnData;
  }, [selectedUserLocationKey, userSoilData]);


  const simulatedCountryData = useMemo(() => {
    if (!selectedCountry) return null;
    // Simple hash function for deterministic "random" values based on country code
    let hash = 0;
    for (let i = 0; i < selectedCountry.length; i++) {
      const char = selectedCountry.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    const random = (seedModifier: number) => {
      const x = Math.sin(hash + seedModifier) * 10000;
      return x - Math.floor(x);
    };
    const sandP = parseFloat((random(2) * 50 + 20).toFixed(1)); // Sand 20-70%
    const clayP = parseFloat((random(3) * 30 + 10).toFixed(1)); // Clay 10-40%
    const siltP = parseFloat(Math.max(0, 100 - sandP - clayP).toFixed(1)); // Silt calculated

    return {
      vessScore: parseFloat((random(1) * 3.5 + 1.5).toFixed(1)), // VESS 1.5-5.0
      sandPercent: sandP,
      clayPercent: clayP,
      siltPercent: siltP,
      tawPercent: parseFloat((random(4) * 15 + 5).toFixed(1)), // TAW 5-20%
    };
  }, [selectedCountry]);


  return (
    <TooltipProvider>
      <Card className="bg-card shadow-md border-border">
        <CardHeader>
          <CardTitle>Compare Your Location Data</CardTitle>
          <CardDescription>Select one of your locations and a country to compare soil data against (simulated country averages).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingUserSoilData && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoadingSpinner size={16} /> Loading your locations...
            </div>
          )}
          {errorUserSoilData && (
            <p className="text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {errorUserSoilData}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="user-location-select" className="mb-2 block text-sm font-medium">Your Location</Label>
              <Select
                value={selectedUserLocationKey ?? ""}
                onValueChange={setSelectedUserLocationKey}
                disabled={userLocations.length === 0 || loadingUserSoilData}
              >
                <SelectTrigger id="user-location-select" className="w-full">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={loadingUserSoilData ? "Loading..." : (userLocations.length > 0 ? "Select your location" : "No locations found")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {userLocations.map(loc => (
                    <SelectItem key={loc.key} value={loc.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 truncate max-w-[280px]">
                            <span>{loc.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start">
                          <p>{loc.fullDetails}</p>
                        </TooltipContent>
                      </Tooltip>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="country-select" className="mb-2 block text-sm font-medium">Country to Compare</Label>
              <Select
                value={selectedCountry ?? ""}
                onValueChange={setSelectedCountry}
              >
                <SelectTrigger id="country-select" className="w-full">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select country" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {countriesList.map(country => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedUserLocationKey && selectedCountry && simulatedCountryData && ( 
            <div className="mt-8 pt-6 border-t border-border">
              <RadarChartComparison
                locationData={selectedLocationSoilData} 
                countryAverageData={simulatedCountryData}
                locationName={userLocations.find(loc => loc.key === selectedUserLocationKey)?.name || "Your Location"}
                countryName={countriesList.find(c => c.value === selectedCountry)?.label || "Selected Country"}
              />
            </div>
          )}
           {/* Placeholder if selections are made but location data is missing or not of the expected type */}
           {selectedUserLocationKey && selectedCountry && !selectedLocationSoilData && !loadingUserSoilData && (
                <p className="text-muted-foreground text-center py-10">
                    No data found for the selected location, or the latest entry does not contain the required metrics for comparison. Please ensure an entry with VESS score or Soil Composition percentages exists.
                </p>
            )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

