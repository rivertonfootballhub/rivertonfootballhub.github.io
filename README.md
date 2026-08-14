# Riverton Football Heat

Mobile-first GitHub Pages app for Riverton, Kansas football-practice heat safety.

- Reads the official NWS `wetBulbGlobeTemperature` grid field for 4–8 PM.
- Shows air temperature, apparent/heat-index temperature, WBGT, active heat alerts, and conservative KSHSAA guidance.
- Creates a branded PNG report through the device share sheet.
- Uses the Riverton USD 404 Rams logo and colors.
- Stores the latest successful daily forecast locally and never leaves the page in a permanent loading state.

## GitHub Pages

Publish from the repository root on the `main` branch. No build step is required.

## Safety

This is a forecast, not a field measurement. An on-field WBGT reading in direct sun 30–60 minutes before practice overrides the forecast.
