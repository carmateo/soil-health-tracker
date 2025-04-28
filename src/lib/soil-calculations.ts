/**
 * Calculates soil properties based on clay and sand percentages using pedotransfer functions.
 * Assumes clay and sand inputs are percentages (0-100).
 */
export interface SoilProperties {
  wiltingPoint: number; // WP (%)
  fieldCapacity: number; // FC (%)
  availableWater: number; // AW = FC - WP (%)
  bulkDensity: number; // BD (g/cm³)
}

/**
 * Calculates soil properties using pedotransfer functions.
 *
 * @param clayPercent - The percentage of clay (0-100).
 * @param sandPercent - The percentage of sand (0-100).
 * @returns An object containing calculated Wilting Point (WP), Field Capacity (FC), Available Water (AW), and Bulk Density (BD). Returns null if inputs are invalid.
 */
export function calculateSoilProperties(
  clayPercent: number | null | undefined,
  sandPercent: number | null | undefined
): SoilProperties | null {
  // Validate inputs: must be numbers between 0 and 100
  if (
    typeof clayPercent !== 'number' || clayPercent < 0 || clayPercent > 100 ||
    typeof sandPercent !== 'number' || sandPercent < 0 || sandPercent > 100
  ) {
    console.warn("Invalid input for calculateSoilProperties: Clay and Sand must be numbers between 0 and 100.", { clayPercent, sandPercent });
    return null;
  }

  // Calculate Wilting Point (WP) - Result is volumetric water content (%)
  const WP = 0.0673 + 0.00064 * clayPercent + 0.00196 * sandPercent;
  // Convert fraction to percentage and cap at reasonable bounds (e.g., 0-60%)
  const wiltingPoint = Math.max(0, Math.min(60, WP * 100));

  // Calculate Field Capacity (FC) - Result is volumetric water content (%)
  const FC = 0.2576 + 0.00203 * clayPercent + 0.00125 * sandPercent;
   // Convert fraction to percentage and cap at reasonable bounds (e.g., WP to 70%)
  const fieldCapacity = Math.max(wiltingPoint, Math.min(70, FC * 100));


  // Calculate Available Water (AW)
  const availableWater = fieldCapacity - wiltingPoint;

  // Calculate Bulk Density (BD) - Result is g/cm³
  const BD = 1.6 - 0.004 * clayPercent;
   // Cap BD at reasonable bounds (e.g., 0.8 to 1.8 g/cm³)
  const bulkDensity = Math.max(0.8, Math.min(1.8, BD));


  return {
     // Return rounded values for practical use
    wiltingPoint: parseFloat(wiltingPoint.toFixed(2)),
    fieldCapacity: parseFloat(fieldCapacity.toFixed(2)),
    availableWater: parseFloat(availableWater.toFixed(2)),
    bulkDensity: parseFloat(bulkDensity.toFixed(2)),
  };
}
