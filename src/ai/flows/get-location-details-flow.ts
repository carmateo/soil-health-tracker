'use server';
/**
 * @fileOverview Provides functionality to determine location details from coordinates.
 *
 * - getLocationDetails - A function that gets country and region from lat/lon.
 * - LocationDetailsInput - The input type for the getLocationDetails function.
 * - LocationDetailsOutput - The return type for the getLocationDetails function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const LocationDetailsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type LocationDetailsInput = z.infer<typeof LocationDetailsInputSchema>;

const LocationDetailsOutputSchema = z.object({
  country: z.string().optional().describe('The country identified for the coordinates.'),
  region: z.string().optional().describe('The primary administrative region (state, province, etc.) identified for the coordinates.'),
  city: z.string().optional().describe('The city identified for the coordinates.'),
});
export type LocationDetailsOutput = z.infer<typeof LocationDetailsOutputSchema>;

export async function getLocationDetails(input: LocationDetailsInput): Promise<LocationDetailsOutput> {
  return getLocationDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getLocationDetailsPrompt',
  input: {
    schema: LocationDetailsInputSchema,
  },
  output: {
    schema: LocationDetailsOutputSchema,
  },
  prompt: `Based on the provided latitude and longitude, identify the country, the primary administrative region (like state or province), and the city if applicable.

Latitude: {{{latitude}}}
Longitude: {{{longitude}}}

Provide the output in the specified JSON format. If a detail cannot be determined, omit the field or set it to null.`,
});

const getLocationDetailsFlow = ai.defineFlow<
  typeof LocationDetailsInputSchema,
  typeof LocationDetailsOutputSchema
>(
  {
    name: 'getLocationDetailsFlow',
    inputSchema: LocationDetailsInputSchema,
    outputSchema: LocationDetailsOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);
        return output || { country: undefined, region: undefined, city: undefined }; // Return empty if output is null/undefined
    } catch (error) {
        console.error("Error in getLocationDetailsFlow:", error);
        // Return an empty object or specific error structure if needed
        return { country: undefined, region: undefined, city: undefined };
    }
  }
);
