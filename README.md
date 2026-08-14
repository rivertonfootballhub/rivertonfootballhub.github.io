# Riverton Football Hub · v2.0

Mobile-first GitHub Pages app for Riverton Pee Wee football families.

- Calculates the next team event from Monday, Tuesday and Thursday 6–8 PM practices plus the 2026 Pee Wee game schedule.
- Shows NWS game-day weather when the next game enters the forecast window.
- Provides the full schedule, Apple Maps directions and downloadable calendar events.
- Reads the NWS WBGT forecast grid for the Riverton athletic field, displays WBGT to one decimal place and opens the exact KSHSAA rules for each hour.
- Shows NWS issuance and retrieval times and places a prominent warning over every saved/cached weather forecast.
- Includes a policy/source page with the April 2026 KSHSAA reference, NWS data endpoints and a source-backed venue directory verified August 14, 2026.
- Loads the upcoming week of official USD 404 lunch choices directly in the app, with separate 3rd- and 4th-grade views.
- Creates a branded PNG practice card through the device share sheet.

## GitHub Pages

Publish every file in this package from the repository root on the `main` branch. The included GitHub workflow refreshes `lunch-menu.json` from the official food-service system each morning.

## Schedule assumptions

Regular-season games begin at 6 PM except the October 31 game. October 31, playoffs and the Super Bowl remain TBD. Verify changes with the team.

## Weather source strategy

The app uses NOAA/National Weather Service forecast grids for planning. The NWS La Crosse WBGT page is linked as an experimental educational cross-check and is not averaged into app values. Forecast values are not field measurements. An on-field WBGT reading in direct sun 30–60 minutes before practice overrides the forecast.
