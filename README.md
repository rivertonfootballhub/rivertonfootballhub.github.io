# Riverton Football Hub · v2.6.1

Mobile-first GitHub Pages app for Riverton Pee Wee football families.

- Calculates the next game from the 2026 Pee Wee schedule.
- Shows NWS game-day weather when the next game enters the forecast window.
- Provides the full schedule, Apple Maps directions and downloadable calendar events.
- Shows the actual current-clock-hour NWS WBGT on Home, then provides the full 4–8 PM outlook with WBGT to one decimal place and the exact KSHSAA rules for each hour on Conditions.
- Shows the NWS grid update time and app retrieval time, and places a prominent warning over every saved/cached weather forecast.
- Shows every active NWS hazard returned for the Riverton point. Missing heat-index and rain values display as an em dash; the app does not replace them with another field or zero.
- Includes a policy/source page with the April 2026 KSHSAA reference, NWS data endpoints and a source-backed venue directory verified August 18, 2026.
- Uses versioned app files and an independent startup-recovery notice to prevent an older cached script from being paired with a newer page.
- Uses a larger Home logo, compact team metadata and a consistent typography system: Title Case for headings/actions and all caps for labels/status/navigation.
- Combines the next-game summary, countdown, forecast availability and actions into one Home card.
- Shows the installed app version, checks the published `version.json`, identifies an available update and provides an explicit reload control.

## v2.6.1 cache-recovery fix

This release gives each app script, stylesheet and manifest URL a version identifier. An older service worker therefore cannot substitute a previous release's JavaScript into the current page. Startup also validates the page shell and shows a reload notice if required elements are unavailable.

## GitHub Pages

Publish every file in this package from the repository root on the `main` branch.

## Schedule assumptions

Dates and opponents come from the team flyer. The 6 PM times shown for Weeks 1–7 are assumptions and are visibly marked with an asterisk; their calendar events are tentative. October 31, playoffs and the Super Bowl remain TBD. Verify every change with the team.

## Weather source strategy

The app uses NOAA/National Weather Service forecast grids for planning. Riverton conditions use the verified Riverton field grid. Game-day weather uses the stored latitude and longitude of the verified game venue when the game enters the NWS forecast window. The NWS La Crosse WBGT page is linked as an experimental educational cross-check and is not averaged into app values. Forecast values are not field measurements. An on-field WBGT reading in direct sun 30–60 minutes before outdoor activity overrides the forecast.
