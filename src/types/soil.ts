
import type { Timestamp } from 'firebase/firestore';

export interface SoilData {
  id?: string; // Optional: Firestore document ID
  userId: string;
  userEmail?: string; // Optional: User's email for display
  date: Timestamp;
  location?: string | null; // Explicitly allow null for manual location name
  locationOption?: 'gps' | 'manual'; // Store how location was determined
  latitude?: number | null; // Optional GPS latitude, allow null
  longitude?: number | null; // Optional GPS longitude, allow null
  country?: string | null; // Added: Country from reverse geocoding
  region?: string | null; // Added: Region/State from reverse geocoding
  city?: string | null; // Added: City from reverse geocoding
  measurementType: 'vess' | 'composition';
  // Make specific measurement fields optional numbers
  vessScore?: number | null; // 1-5, only if measurementType is 'vess', allow null
  sand?: number | null; // cm, only if measurementType is 'composition', allow null
  clay?: number | null; // cm, only if measurementType is 'composition', allow null
  silt?: number | null; // cm, only if measurementType is 'composition', allow null
  sandPercent?: number | null; // Auto-calculated, allow null
  clayPercent?: number | null; // Auto-calculated, allow null
  siltPercent?: number | null; // Auto-calculated, allow null
  privacy: 'public' | 'private';
  // Added index signature to allow string indexing like entry[comp] in table
  [key: string]: any;
}

export interface UserSettings {
 defaultPrivacy: 'public' | 'private';
 // Add other potential settings here
}
