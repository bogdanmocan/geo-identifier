// geo-identifier: read the device location once on button press and
// report which mountain-range polygons (OSM data) contain it.
// No automatic refresh yet.

const LEVELS = [
  { label: "Level 1 (range)", url: "data/romania-mountain-ranges.geojson" },
  { label: "Level 2 (subunit)", url: "data/romania-mountain-subunits-level2.geojson" },
  { label: "Level 3 (protected massif)", url: "data/romania-protected-massifs-level3.geojson" },
];

const button = document.getElementById("locate");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const resultEl = document.getElementById("result");

let features = [];

// Load all polygon levels once. Failure is reported in the status line, not thrown.
Promise.all(
  LEVELS.map((level) =>
    fetch(level.url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${level.url}`);
      return response.json();
    })
  )
)
  .then((collections) => {
    // Tag each feature with its level label so results can be grouped.
    features = collections.flatMap((c, i) =>
      (c.features || []).map((f) => {
        f.properties.level_label = LEVELS[i].label;
        return f;
      })
    );
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
  // Clear previous output, then list hits grouped by level.
  resultEl.replaceChildren();
  if (hits.length === 0) {
    resultEl.textContent = "Not inside any loaded polygon.";
    return;
  }
  for (const level of LEVELS) {
    const inLevel = hits.filter((f) => f.properties.level_label === level.label);
    const line = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = level.label + ": ";
    line.appendChild(title);
    // Show each name with its language. Names without a Romanian or English
    // tag are shown with their inferred language, e.g. "Busov (sk)".
    line.appendChild(
      document.createTextNode(
        inLevel.length
          ? inLevel.map((f) => `${f.properties.display_name} (${f.properties.display_lang})`).join(", ")
          : "none"
      )
    );
    resultEl.appendChild(line);
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
