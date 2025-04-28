/**
 * Represents a geographical coordinate.
 */
export interface Coordinate {
  /**
   * The latitude of the location.
   */
  latitude: number;
  /**
   * The longitude of the location.
   */
  longitude: number;
}

/**
 * Asynchronously retrieves the current geographical location of the user.
 *
 * @returns A promise that resolves to a Coordinate object containing latitude and longitude.
 */
export async function getCurrentLocation(): Promise<Coordinate> {
  // TODO: Implement this by calling an API.
  return {
    latitude: 34.0522,
    longitude: -118.2437,
  };
}
