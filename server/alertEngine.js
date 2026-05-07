import { metricLabels, metricUnits, zones } from "./data/zones.js";
import { saveAlert } from "./storage.js";

const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
const recentAlertKeys = new Map(); // key -> last reading-time (ms epoch)

// Dedup window: at most one alert per (zone, metric, severity) per
// 30 min of *reading time*. Using reading time (not wall clock) means
// seeded historical readings dedup correctly across the past 7 days,
// while live readings still respect a sensible cooldown.
const DEDUP_WINDOW_MS = 30 * 60_000;

export async function evaluateReading(reading, { suppressDeduplication = false } = {}) {
  const zone = zoneById.get(reading.zoneId);
  const threshold = zone?.thresholds?.[reading.metric];
  if (!threshold || reading.value <= threshold) return null;

  const ratio = reading.value / threshold;
  const severity = ratio >= 1.25 ? "critical" : "warning";
  const key = `${reading.zoneId}:${reading.metric}:${severity}`;
  const readingTime = new Date(reading.recordedAt || Date.now()).getTime();

  if (!suppressDeduplication) {
    const lastAt = recentAlertKeys.get(key) || 0;
    if (readingTime - lastAt < DEDUP_WINDOW_MS) return null;
    recentAlertKeys.set(key, readingTime);
  }

  const label = metricLabels[reading.metric] || reading.metric;
  const unit = metricUnits[reading.metric] || reading.unit;

  return saveAlert({
    zoneId: reading.zoneId,
    metric: reading.metric,
    value: Number(reading.value.toFixed(2)),
    threshold,
    severity,
    message: `${label} exceeded ${threshold} ${unit} in ${zone.name}`,
    recordedAt: reading.recordedAt
  });
}
