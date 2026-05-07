import fs from "fs";
import path from "path";
import { metricUnits, zones } from "./data/zones.js";

const defaultReplayIntervalMs = 5000;
const zoneIds = new Set(zones.map((zone) => zone.id));
const metricIds = new Set(Object.keys(metricUnits));

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizeReading(row, index) {
  const zoneId = row.zoneId || row.zone || row.district;
  const metric = row.metric || row.metricId || row.signal;
  const value = Number(row.value);

  if (!zoneIds.has(zoneId)) {
    throw new Error(`Dataset row ${index + 2} has unknown zoneId "${zoneId}"`);
  }

  if (!metricIds.has(metric)) {
    throw new Error(`Dataset row ${index + 2} has unknown metric "${metric}"`);
  }

  if (!Number.isFinite(value)) {
    throw new Error(`Dataset row ${index + 2} has invalid value "${row.value}"`);
  }

  return {
    sensorId: row.sensorId || `${zoneId}-${metric}-dataset`,
    zoneId,
    metric,
    value,
    unit: row.unit || metricUnits[metric],
    recordedAt: row.recordedAt || row.timestamp || row.datetime || new Date().toISOString(),
    source: "dataset"
  };
}

export function startDatasetPlayer({ datasetPath, intervalMs, loop = true, onReading }) {
  if (!datasetPath) return null;

  const resolvedPath = path.resolve(process.cwd(), datasetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Dataset file not found at ${resolvedPath}. Dataset replay is disabled.`);
    return null;
  }

  const content = fs.readFileSync(resolvedPath, "utf8");
  const rows = parseCsv(content);
  const readings = rows.map(normalizeReading).sort((left, right) => {
    return new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime();
  });
  const replayIntervalMs = Number(intervalMs) || defaultReplayIntervalMs;

  if (!readings.length) {
    console.warn(`Dataset file ${resolvedPath} did not contain any readings.`);
    return null;
  }

  let replayCount = 0;

  function emitDatasetPass() {
    const passStartedAt = Date.now();

    for (const [index, reading] of readings.entries()) {
      const recordedAt = new Date(passStartedAt + index * 1000);
      Promise.resolve(onReading({ ...reading, recordedAt })).catch(console.error);
    }

    replayCount += 1;
    if (!loop && replayCount > 0) {
      clearInterval(timer);
    }
  }

  const timer = setInterval(emitDatasetPass, replayIntervalMs);
  emitDatasetPass();
  console.log(`Dataset replay started from ${resolvedPath} with ${readings.length} readings.`);

  return () => clearInterval(timer);
}
