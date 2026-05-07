import { forEachSensor, generateReading } from "./simulator.js";
import { bulkSaveReadings, countRecentReadings, saveAlert } from "./storage.js";
import { metricLabels, metricUnits, zones } from "./data/zones.js";

const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

// Backfills the reading store with synthetic but coherent history so the
// 1h / 24h / 7d charts have data immediately after `npm run dev`.
//
// Time is walked forward in coarse steps so the simulator's smoothing
// state evolves naturally, which means the seeded history blends
// seamlessly into live readings once the simulator interval fires.
//
// Skips automatically when the store already contains data for the
// requested window — avoids re-seeding on every restart while Mongo
// already has history.
export async function seedHistory({ days = 7, stepMinutes = 10, force = false } = {}) {
  if (force) {
    const { purgeAllReadings } = await import("./storage.js");
    await purgeAllReadings();
  }
  const { count: existing, earliest } = await countRecentReadings(days);
  // Only skip if the existing data actually covers most of the
  // requested window — otherwise sparse "live-only" data from prior
  // runs would suppress the backfill and charts would still look
  // empty for older time ranges.
  const windowMs = days * 24 * 60 * 60_000;
  const earliestMs = earliest ? new Date(earliest).getTime() : Date.now();
  const coveredMs = Date.now() - earliestMs;
  const coveredFraction = coveredMs / windowMs;
  const minExpected = 8 * 5 * 3 * 24 * days * 0.5;
  if (existing >= minExpected && coveredFraction >= 0.8) {
    return { inserted: 0, alerts: 0, days, stepMinutes, skipped: true, existing };
  }

  const stepMs = stepMinutes * 60_000;
  const start = Date.now() - days * 24 * 60 * 60_000;
  const end = Date.now() - 60_000;

  // Reading-time alert dedup so we don't generate one alert per step
  // for the same persistent breach. Window: 30 minutes per
  // (zone, metric, severity).
  const lastAlertAt = new Map();
  const dedupWindowMs = 30 * 60_000;

  let inserted = 0;
  let alerts = 0;
  let batch = [];
  const flushSize = 5000;

  async function flush() {
    if (!batch.length) return;
    const written = await bulkSaveReadings(batch);
    inserted += written;
    batch = [];
  }

  for (let cursor = start; cursor <= end; cursor += stepMs) {
    const recordedAt = new Date(cursor);
    const stepReadings = [];

    forEachSensor(({ zone, metric, sensorIdx }) => {
      const reading = generateReading({
        zoneId: zone.id,
        metric,
        recordedAt,
        sensorIndex: sensorIdx,
        source: "history"
      });
      stepReadings.push(reading);
      batch.push(reading);
    });

    // Threshold check uses the per-step reading set; first sensor over
    // threshold per (zone, metric) wins.
    const breachSeen = new Set();
    for (const reading of stepReadings) {
      const zone = zoneById.get(reading.zoneId);
      const threshold = zone?.thresholds?.[reading.metric];
      if (!threshold || reading.value <= threshold) continue;
      const groupKey = `${reading.zoneId}:${reading.metric}`;
      if (breachSeen.has(groupKey)) continue;
      breachSeen.add(groupKey);

      const ratio = reading.value / threshold;
      const severity = ratio >= 1.25 ? "critical" : "warning";
      const dedupKey = `${groupKey}:${severity}`;
      const last = lastAlertAt.get(dedupKey) || 0;
      if (cursor - last < dedupWindowMs) continue;
      lastAlertAt.set(dedupKey, cursor);

      await saveAlert({
        zoneId: reading.zoneId,
        metric: reading.metric,
        value: Number(reading.value.toFixed(2)),
        threshold,
        severity,
        message: `${metricLabels[reading.metric] || reading.metric} exceeded ${threshold} ${
          metricUnits[reading.metric] || reading.unit
        } in ${zone.name}`,
        recordedAt: reading.recordedAt
      });
      alerts += 1;
    }

    if (batch.length >= flushSize) await flush();
  }

  await flush();
  return { inserted, alerts, days, stepMinutes, skipped: false };
}
