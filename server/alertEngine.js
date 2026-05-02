import { metricLabels, metricUnits, zones } from "./data/zones.js";
import { saveAlert } from "./storage.js";

const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
const recentAlertKeys = new Map();

export async function evaluateReading(reading) {
  const zone = zoneById.get(reading.zoneId);
  const threshold = zone?.thresholds?.[reading.metric];
  if (!threshold || reading.value <= threshold) return null;

  const ratio = reading.value / threshold;
  const severity = ratio >= 1.25 ? "critical" : "warning";
  const key = `${reading.zoneId}:${reading.metric}:${severity}`;
  const lastAlertAt = recentAlertKeys.get(key) || 0;

  if (Date.now() - lastAlertAt < 15000) return null;
  recentAlertKeys.set(key, Date.now());

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
