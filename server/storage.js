import mongoose from "mongoose";
import { Alert, Reading, ZoneConfig } from "./models.js";
import { zones } from "./data/zones.js";

const memory = {
  readings: [],
  alerts: [],
  zones: [...zones]
};

const validZoneIds = new Set(zones.map((zone) => zone.id));

let mongoReady = false;

export async function initStorage(mongoUri) {
  if (!mongoUri) return { mode: "memory" };

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    mongoReady = true;
    await purgeLegacyData();
    await seedZones();
    return { mode: "mongodb" };
  } catch (error) {
    console.warn("MongoDB unavailable, using in-memory storage:", error.message);
    mongoReady = false;
    return { mode: "memory" };
  }
}

// Drop any data from previous schema versions (old zone ids like
// `central`, `north`, `south`, `east`, `west`, etc.). This keeps the
// dashboard, reports, and city pickers consistent with the current
// 8-city Indian metro roster.
async function purgeLegacyData() {
  const allowed = Array.from(validZoneIds);
  const filter = { zoneId: { $nin: allowed } };
  const [readingsResult, alertsResult, zonesResult] = await Promise.all([
    Reading.deleteMany(filter),
    Alert.deleteMany(filter),
    ZoneConfig.deleteMany({ id: { $nin: allowed } })
  ]);
  const purged =
    (readingsResult.deletedCount || 0) +
    (alertsResult.deletedCount || 0) +
    (zonesResult.deletedCount || 0);
  if (purged > 0) {
    console.log(
      `Purged legacy data: ${readingsResult.deletedCount || 0} readings, ` +
        `${alertsResult.deletedCount || 0} alerts, ` +
        `${zonesResult.deletedCount || 0} zones.`
    );
  }
}

async function seedZones() {
  for (const zone of zones) {
    await ZoneConfig.updateOne({ id: zone.id }, { $set: zone }, { upsert: true });
  }
}

// Used by the history seeder to decide whether to backfill. Returns
// `{ count, earliest }` for the last `days` days where `earliest` is
// the timestamp of the oldest reading within that window (or null if
// the window has no data).
export async function countRecentReadings(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  if (mongoReady) {
    const [count, oldest] = await Promise.all([
      Reading.countDocuments({ recordedAt: { $gte: since } }),
      Reading.findOne({ recordedAt: { $gte: since } })
        .sort({ recordedAt: 1 })
        .select({ recordedAt: 1 })
        .lean()
    ]);
    return { count, earliest: oldest?.recordedAt || null };
  }
  const inWindow = memory.readings.filter((reading) => reading.recordedAt >= since);
  const earliest = inWindow.reduce((min, reading) => {
    if (!min) return reading.recordedAt;
    return reading.recordedAt < min ? reading.recordedAt : min;
  }, null);
  return { count: inWindow.length, earliest };
}

// Wipe ALL readings + alerts. Used by SEED_HISTORY_FORCE=true to
// rebuild history from scratch when simulator math has changed.
export async function purgeAllReadings() {
  if (mongoReady) {
    const [r, a] = await Promise.all([
      Reading.deleteMany({}),
      Alert.deleteMany({})
    ]);
    console.log(
      `Purged all readings (${r.deletedCount}) and alerts (${a.deletedCount}).`
    );
    return;
  }
  memory.readings = [];
  memory.alerts = [];
}

// Bulk insert path for history seeding to avoid one round-trip per row.
export async function bulkSaveReadings(readings) {  if (!readings.length) return 0;
  const normalized = readings.map((reading) => ({
    ...reading,
    recordedAt: new Date(reading.recordedAt || Date.now())
  }));
  if (mongoReady) {
    await Reading.insertMany(normalized, { ordered: false });
    return normalized.length;
  }
  for (const reading of normalized) memory.readings.push(reading);
  if (memory.readings.length > 500_000) {
    memory.readings = memory.readings.slice(-500_000);
  }
  return normalized.length;
}

function parseRange(range = "24h") {
  const match = String(range).match(/^(\d+)(h|d)$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  return match[2] === "d" ? value * 24 * 60 * 60 * 1000 : value * 60 * 60 * 1000;
}

export async function saveReading(reading) {
  const normalized = { ...reading, recordedAt: new Date(reading.recordedAt || Date.now()) };
  if (mongoReady) {
    return Reading.create(normalized);
  }
  memory.readings.push(normalized);
  if (memory.readings.length > 500_000) {
    memory.readings = memory.readings.slice(-500_000);
  }
  return normalized;
}

export async function listReadings({ zoneId, metric, range = "24h", limit = 240 } = {}) {
  const since = new Date(Date.now() - parseRange(range));
  const query = {
    recordedAt: { $gte: since }
  };
  if (zoneId && zoneId !== "all") query.zoneId = zoneId;
  if (metric && metric !== "all") query.metric = metric;

  if (mongoReady) {
    return Reading.find(query).sort({ recordedAt: -1 }).limit(Number(limit)).lean();
  }

  return memory.readings
    .filter((reading) => reading.recordedAt >= since)
    .filter((reading) => !query.zoneId || reading.zoneId === query.zoneId)
    .filter((reading) => !query.metric || reading.metric === query.metric)
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .slice(0, Number(limit));
}

export async function saveAlert(alert) {
  const normalized = { ...alert, recordedAt: new Date(alert.recordedAt || Date.now()) };
  if (mongoReady) {
    return Alert.create(normalized);
  }
  memory.alerts.unshift(normalized);
  if (memory.alerts.length > 5000) {
    memory.alerts = memory.alerts.slice(0, 5000);
  }
  return normalized;
}

export async function listAlerts({ zoneId, range = "24h", limit = 80 } = {}) {
  const since = new Date(Date.now() - parseRange(range));
  const query = { recordedAt: { $gte: since } };
  if (zoneId && zoneId !== "all") query.zoneId = zoneId;

  if (mongoReady) {
    return Alert.find(query).sort({ recordedAt: -1 }).limit(Number(limit)).lean();
  }

  return memory.alerts
    .filter((alert) => alert.recordedAt >= since)
    .filter((alert) => !query.zoneId || alert.zoneId === query.zoneId)
    .slice(0, Number(limit));
}

export async function listZones() {
  if (mongoReady) {
    return ZoneConfig.find({}).sort({ name: 1 }).lean();
  }
  return memory.zones;
}

export async function getReport({ zoneId = "all", range = "7d" } = {}) {
  const [readings, alerts, allZones] = await Promise.all([
    listReadings({ zoneId, range, limit: 5000 }),
    listAlerts({ zoneId, range, limit: 500 }),
    listZones()
  ]);

  const grouped = readings.reduce((acc, reading) => {
    const key = `${reading.zoneId}:${reading.metric}`;
    const item = acc[key] || {
      zoneId: reading.zoneId,
      metric: reading.metric,
      count: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      total: 0,
      unit: reading.unit
    };
    item.count += 1;
    item.min = Math.min(item.min, reading.value);
    item.max = Math.max(item.max, reading.value);
    item.total += reading.value;
    acc[key] = item;
    return acc;
  }, {});

  const summaries = Object.values(grouped).map((item) => ({
    ...item,
    average: Number((item.total / item.count).toFixed(2)),
    min: Number(item.min.toFixed(2)),
    max: Number(item.max.toFixed(2))
  }));

  return {
    generatedAt: new Date().toISOString(),
    range,
    zoneId,
    zones: zoneId === "all" ? allZones : allZones.filter((zone) => zone.id === zoneId),
    totalReadings: readings.length,
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter((alert) => alert.severity === "critical").length,
    summaries,
    alerts
  };
}

export function reportToCsv(report) {
  const header = "zoneId,metric,count,min,max,average,unit";
  const rows = report.summaries.map((item) =>
    [item.zoneId, item.metric, item.count, item.min, item.max, item.average, item.unit].join(",")
  );
  return [header, ...rows].join("\n");
}
