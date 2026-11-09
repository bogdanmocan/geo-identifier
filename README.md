# geo-identifier

A small web app that tells you which geographic region you are currently in, based on your phone's location.

Example output (planned):

- Carpathians → Oaș Mountains → Tibleș massif
- Transylvanian Plateau → subdivision X
- Baia Mare Depression
- Western Plain → Crișurilor Plain

## Goals

- Works in a web browser, written with plain HTML and JavaScript, no backend.
- Requests location permission only. No camera or other sensors.
- Runs on iOS Safari.
- Detects the region from the coordinates using polygons (GeoJSON).
- Refreshes the displayed region every 5 seconds, and updates only when the region changes.
- Starts with Romania.

## Status

Discovery phase. Current findings:

- The [Geomorphometric Atlas of Romania](https://doi.org/10.1080/17445647.2024.2354712) provides landform classes (geomorphons, slope and terrain variables), not named region polygons. It is not enough on its own for region names.
- Region polygons still need a source: a manual build from a reference map, OpenStreetMap, or another dataset.
- GPS accuracy on a phone is typically 5 to 20 m. Region borders are transitional, so the app should use a margin (hysteresis) to avoid flickering between regions near a border.

## Planned structure

```
index.html        # page and UI
app.js            # geolocation, point-in-polygon, 5 s refresh
data/             # GeoJSON polygons for regions and massifs
```

## Notes

- The Geolocation API on iOS Safari requires HTTPS.
- `watchPosition` stops when the page goes to the background or the screen locks.
