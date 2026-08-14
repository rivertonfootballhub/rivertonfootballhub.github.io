# Riverton Rams Practice Conditions

Mobile-first GitHub Pages app for Riverton, Kansas football-practice heat safety.

- Reads the NWS `wetBulbGlobeTemperature` forecast grid for the Riverton USD 404 athletic-field location from 4–8 PM.
- Shows air temperature, apparent/heat-index temperature, WBGT, active heat alerts, and hour-specific KSHSAA guidance.
- Creates a branded PNG practice card through the device share sheet.
- Treats 6–8 PM as the practice window while retaining 4–5 PM as lead-up context.
- Each hourly row opens the exact KSHSAA rules for that hour; no earlier hour controls an overall practice decision.
- Uses the Riverton USD 404 Rams logo and colors.
- Stores the latest successful daily forecast locally and never leaves the page in a permanent loading state.

## GitHub Pages

Publish from the repository root on the `main` branch. No build step is required.

## Safety

This is a forecast, not a field measurement. An on-field WBGT reading in direct sun 30–60 minutes before practice overrides the forecast.
