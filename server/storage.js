import mongoose from "mongoose";
import { Alert, Reading, ZoneConfig } from "./models.js";
import { zones } from "./data/zones.js";

const memory = {
  readings: [],
  alerts: [],
  zones: [...zones]
};

let mongoReady = false;

export async function initStorage(mongoUri) {
  if (!mongoUri) return { mode: "memory" };

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    mongoReady = true;
    await seedZones();
    return { mode: "mongodb" };
  } catch (error) {
    console.warn("MongoDB unavailable, using in-memory storage:", error.message);
    mongoReady = false;
    return { mode: "memory" };
  }
}

async function seedZones() {
  for (const zone of zones) {
    await ZoneConfig.updateOne({ id: zone.id }, { $set: zone }, { upsert: true });
  }
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
  memory.readings = memory.readings.slice(-8000);
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
  memory.alerts = memory.alerts.slice(0, 300);
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
