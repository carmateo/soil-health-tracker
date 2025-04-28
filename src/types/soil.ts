
import type { Timestamp } from 'firebase/firestore';

export interface SoilData {
  id?: string; // Optional: Firestore document ID
  userId: string;
  date: Timestamp;
  location?: string; // Optional location/field name
  locationOption?: 'gps' | 'manual'; // Store how location was determined
  latitude?: number; // Optional GPS latitude
  longitude?: number; // Optional GPS longitude
  measurementType: 'vess' | 'composition';
  // Make specific measurement fields optional numbers
  vessScore?: number | undefined; // 1-5, only if measurementType is 'vess'
  sand?: number | undefined; // cm, only if measurementType is 'composition'
  clay?: number | undefined; // cm, only if measurementType is 'composition'
  silt?: number | undefined; // cm, only if measurementType is 'composition'
  sandPercent?: number | undefined; // Auto-calculated
  clayPercent?: number | undefined; // Auto-calculated
  siltPercent?: number | undefined; // Auto-calculated
  privacy: 'public' | 'private';
  // Added index signature to allow string indexing like entry[comp] in table
  [key: string]: any;
}

export interface UserSettings {
 defaultPrivacy: 'public' | 'private';
 // Add other potential settings here
}
