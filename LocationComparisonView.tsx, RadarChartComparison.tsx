The behavior you're describing, where VESS score for the location is shown but Sand (%), Clay (%), Silt (%), and TAW (%) are shown as "N/A" (or their lines go to 0 on the radar chart), strongly suggests that the *latest data entry* for the selected location is a "VESS" type measurement, not a "Composition" type.

Here's how the system works:
1.  In the "Compare Locations" tab (`LocationComparisonView.tsx`), when you select one of "Your Locations", the system fetches all data entries for that specific location.
2.  It then picks the **most recent (latest) entry** based on the date.
3.  This single latest entry's data is then passed to the `RadarChartComparison.tsx` component.
    *   If this latest entry is a `measurementType: 'vess'`, then `vessScore` will be used, and `sandPercent`, `clayPercent`, `siltPercent`, and `tawPercent` will correctly be treated as `null` (showing "N/A" in the tooltip or 0 on the chart axis for the location).
    *   If this latest entry is a `measurementType: 'composition'`, the system will use its `sandPercent`, `clayPercent`, `siltPercent` values (if they are numbers in the database) and the calculated `tawPercent`. If these percentage fields are `null` in the database for that composition entry, they will also show as "N/A".

The fact that you see "VESS" score data for the location implies the system correctly identified the measurement type of that latest entry. If it's a VESS entry, it inherently does not have Sand/Clay/Silt percentages.

**Conclusion:**
The current code appears to be correctly reflecting the data of the *latest entry* for the selected location. If you want to see Sand/Clay/Silt/TAW values for your location on the radar chart, please ensure that:
1.  You have "Composition" type entries for that location.
2.  The *most recent entry* for that specific location is a "Composition" type entry.
3.  That "Composition" entry has non-null, numeric values saved for Sand (%), Clay (%), and Silt (%) in the database. (TAW is calculated from these).

If the latest entry for a location is indeed a VESS assessment, the chart is correctly displaying "N/A" for the composition-specific metrics for "Your Location", while still showing the simulated country averages for those metrics.

No code changes are required for this specific issue, as the component seems to be accurately representing the data based on its current logic (using the single latest entry for the location).
