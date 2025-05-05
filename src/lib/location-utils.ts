import type { SoilData } from '@/types/soil';

/**
 * Generates a unique key, display name, and full details string for a location based on SoilData.
 *
 * @param entry - The soil data entry.
 * @returns An object containing the location key, name, and full details.
 */
export const getLocationKeyAndName = (entry: SoilData): { key: string; name: string; fullDetails: string } => {
  if (entry.locationOption === 'manual' && entry.location) {
    const key = `manual_${entry.location.trim().toLowerCase().replace(/\s+/g, '_')}`; // Normalize key
    const name = entry.location.trim();
    return { key, name, fullDetails: name };
  } else if (entry.locationOption === 'gps' && entry.latitude != null && entry.longitude != null) {
    const lat = entry.latitude.toFixed(4); // Use 4 decimal places for key consistency
    const lon = entry.longitude.toFixed(4);
    const key = `gps_${lat}_${lon}`;
    const detailsArray = [entry.city, entry.region, entry.country].filter(Boolean);
    const detailsString = detailsArray.length > 0 ? ` (${detailsArray.join(', ')})` : '';
    const baseName = `GPS: ${entry.latitude.toFixed(2)}, ${entry.longitude.toFixed(2)}`; // Shorter display name
    const truncatedDetails = detailsString.length > 30 ? detailsString.substring(0, 27) + '...' : detailsString;
    const name = baseName + truncatedDetails;
    const fullDetails = `Lat: ${entry.latitude.toFixed(5)}, Lon: ${entry.longitude.toFixed(5)}${detailsArray.length > 0 ? ` (${detailsArray.join(', ')})` : ''}`;
    return { key, name, fullDetails };
  }
  const key = `unknown_${entry.id ?? Math.random().toString(36).substring(7)}`; // Fallback key using ID or random string
  return { key, name: 'Unknown Location', fullDetails: 'No valid location data' };
};

/**
 * Extracts unique locations from an array of SoilData entries.
 *
 * @param data - An array of soil data entries.
 * @returns An array of unique location objects, each with key, name, and fullDetails.
 */
export function getUniqueLocations(data: Array<SoilData & { id: string }>): Array<{ key: string; name: string; fullDetails: string }> {
    const locationsMap = new Map<string, { name: string; fullDetails: string }>();
    data.forEach(entry => {
        const { key, name, fullDetails } = getLocationKeyAndName(entry);
        if (!locationsMap.has(key)) {
            locationsMap.set(key, { name, fullDetails });
        }
    });
    // Convert map entries to array and sort alphabetically by name
    return Array.from(locationsMap.entries())
        .map(([key, { name, fullDetails }]) => ({ key, name, fullDetails }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
