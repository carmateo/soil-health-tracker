import type { Timestamp } from 'firebase/firestore';

export interface SoilData {
  id?: string; // Optional: Firestore document ID
  userId: string;
  date: Timestamp;
  location?: string; // Optional location/field name
  latitude?: number; // Optional GPS latitude
  longitude?: number; // Optional GPS longitude
  measurementType: 'vess' | 'composition';
  vessScore?: number; // 1-5, only if measurementType is 'vess'
  sand?: number; // cm, only if measurementType is 'composition'
  clay?: number; // cm, only if measurementType is 'composition'
  silt?: number; // cm, only if measurementType is 'composition'
  sandPercent?: number; // Auto-calculated
  clayPercent?: number; // Auto-calculated
  siltPercent?: number; // Auto-calculated
  privacy: 'public' | 'private';
}

export interface UserSettings {
 defaultPrivacy: 'public' | 'private';
 // Add other potential settings here
}
