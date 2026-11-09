// geo-identifier: read the device location once on button press and
// report which mountain-range polygons (OSM data) contain it.
// No automatic refresh yet.

const DATA_URLS = [
  "data/romania-mountain-ranges.geojson",          // level 1: major ranges
  "data/romania-mountain-subunits-level2.geojson", // level 2: subunits
];

const button = document.getElementById("locate");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const resultEl = document.getElementById("result");

let features = [];

// Load all polygon levels once. Failure is reported in the status line, not thrown.
Promise.all(
  DATA_URLS.map((url) =>
    fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return response.json();
    })
  )
)
  .then((collections) => {
    features = collections.flatMap((c) => c.features || []);
    statusEl.textContent = `Loaded ${features.length} polygons. Press the button to read your location.`;
  })
  .catch((err) => {
    statusEl.textContent = `Could not load polygons: ${err.message}`;
  });

// Ray-casting test for one ring of [lon, lat] pairs.
function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat);
    if (crosses && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// MultiPolygon: array of polygons; each polygon is [outerRing, ...holes].
// Holes are ignored here, so points inside a hole are reported as inside.
function featureContains(feature, lon, lat) {
  const geom = feature.geometry;
  const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polygons.some((poly) => ringContains(poly[0], lon, lat));
}

function describe(lat, lon, accuracy) {
  coordsEl.textContent =
    `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)} (accuracy ±${Math.round(accuracy)} m)`;

  const hits = features.filter((f) => featureContains(f, lon, lat));
  if (hits.length === 0) {
    resultEl.textContent = "Not inside any loaded mountain-range polygon.";
  } else {
    // Show each hit with its OSM name language. Names without a Romanian or English
    // tag are shown in their inferred language, e.g. "Busov (sk)".
    resultEl.textContent =
      "Inside: " +
      hits.map((f) => `${f.properties.display_name} (${f.properties.display_lang})`).join(", ");
  }
}

button.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    statusEl.textContent = "Geolocation is not available in this browser.";
    return;
  }
  statusEl.textContent = "Requesting location...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      statusEl.textContent = "Location received.";
      describe(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    },
    (err) => {
      statusEl.textContent = `Location error: ${err.message}`;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});
