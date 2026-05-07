import { metricUnits, zones } from "./data/zones.js";

const metrics = ["trafficFlow", "pm25", "electricityKw", "waterLitres", "noiseDb"];
const defaultSimulationIntervalMs = 60_000;

const zoneProfiles = {
  central: {
    traffic: 1.35,
    air: 1.05,
    power: 1.32,
    water: 0.92,
    noise: 1.2,
    volatility: 0.08,
    sensors: 4
  },
  north: {
    traffic: 0.78,
    air: 0.82,
    power: 0.78,
    water: 1.15,
    noise: 0.78,
    volatility: 0.05,
    sensors: 3
  },
  east: {
    traffic: 0.98,
    air: 1.42,
    power: 1.48,
    water: 0.9,
    noise: 1.34,
    volatility: 0.1,
    sensors: 4
  },
  south: {
    traffic: 0.72,
    air: 0.92,
    power: 1.2,
    water: 1.42,
    noise: 0.86,
    volatility: 0.06,
    sensors: 3
  },
  west: {
    traffic: 1.52,
    air: 1.08,
    power: 0.82,
    water: 0.76,
    noise: 1.28,
    volatility: 0.09,
    sensors: 4
  }
};

const metricProfiles = {
  trafficFlow: { base: 420, floor: 90, ceiling: 1120, jitter: 12, response: 0.16 },
  pm25: { base: 39, floor: 12, ceiling: 125, jitter: 1.4, response: 0.12 },
  electricityKw: { base: 2600, floor: 850, ceiling: 7200, jitter: 48, response: 0.13 },
  waterLitres: { base: 98000, floor: 32000, ceiling: 250000, jitter: 1500, response: 0.11 },
  noiseDb: { base: 58, floor: 35, ceiling: 96, jitter: 0.9, response: 0.14 }
};

const sensorState = new Map();
const incidentState = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function gaussianNoise() {
  const first = 1 - Math.random();
  const second = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function hourOfDay(date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function peak(hour, center, width) {
  return Math.exp(-0.5 * ((hour - center) / width) ** 2);
}

function daytime(hour) {
  return clamp((Math.sin(((hour - 6) / 14) * Math.PI) + 0.2) / 1.2, 0, 1);
}

function isWeekend(date) {
  return [0, 6].includes(date.getDay());
}

function floorToMinute(date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
}

function dailyFactors(date) {
  const hour = hourOfDay(date);
  const weekend = isWeekend(date);
  const morningRush = peak(hour, weekend ? 10.2 : 8.4, weekend ? 1.25 : 0.9);
  const eveningRush = peak(hour, weekend ? 18.8 : 17.7, weekend ? 1.3 : 1.05);
  const lunch = peak(hour, 13.1, 1.35);
  const nightQuiet = hour < 5 || hour > 23 ? 0.48 : 1;
  const businessHours = weekend ? daytime(hour) * 0.58 : clamp(daytime(hour) * 1.15, 0, 1.1);
  const residentialEvening = peak(hour, 20.2, 1.8);
  const residentialMorning = peak(hour, 7.1, 0.95);

  return {
    hour,
    weekend,
    commute: weekend ? 0.55 * morningRush + 0.65 * eveningRush : morningRush + eveningRush,
    lunch,
    nightQuiet,
    businessHours,
    residential: residentialMorning + residentialEvening,
    industrialShift: weekend ? 0.62 : hour >= 6 && hour <= 22 ? 1 : 0.72
  };
}

function incidentMultiplier(zone, metric, now) {
  const key = `${zone.id}:${metric}`;
  const current = incidentState.get(key);

  if (current && current.expiresAt > now.getTime()) {
    return current.multiplier;
  }

  if (current) incidentState.delete(key);

  const incidentChance = {
    trafficFlow: zone.id === "west" || zone.id === "central" ? 0.009 : 0.003,
    pm25: zone.id === "east" ? 0.007 : 0.002,
    electricityKw: zone.id === "east" || zone.id === "central" ? 0.004 : 0.0015,
    waterLitres: zone.id === "south" || zone.id === "north" ? 0.004 : 0.0015,
    noiseDb: zone.id === "east" || zone.id === "west" ? 0.006 : 0.002
  }[metric];

  if (Math.random() > incidentChance) return 1;

  const multiplier = {
    trafficFlow: 1.28 + Math.random() * 0.28,
    pm25: 1.2 + Math.random() * 0.32,
    electricityKw: 1.12 + Math.random() * 0.18,
    waterLitres: 1.14 + Math.random() * 0.24,
    noiseDb: 1.12 + Math.random() * 0.18
  }[metric];

  incidentState.set(key, {
    multiplier,
    expiresAt: now.getTime() + (10 * 60_000 + Math.random() * 25 * 60_000)
  });

  return multiplier;
}

function baselineFor(zone, metric, date) {
  const factors = dailyFactors(date);
  const zoneProfile = zoneProfiles[zone.id] || zoneProfiles.central;
  const metricProfile = metricProfiles[metric];
  const threshold = zone.thresholds[metric];

  if (metric === "trafficFlow") {
    const commuteLoad = 0.62 + factors.commute * 0.82 + factors.lunch * 0.18;
    const weekendAdjustment = factors.weekend ? 0.72 : 1;
    return metricProfile.base * zoneProfile.traffic * commuteLoad * factors.nightQuiet * weekendAdjustment;
  }

  if (metric === "electricityKw") {
    const commercialLoad = 0.58 + factors.businessHours * 0.72;
    const residentialLoad = zone.id === "north" ? factors.residential * 0.34 : factors.residential * 0.12;
    const industrialLoad = zone.id === "east" ? factors.industrialShift * 0.42 : 0;
    return metricProfile.base * zoneProfile.power * (commercialLoad + residentialLoad + industrialLoad);
  }

  if (metric === "waterLitres") {
    const morningUse = peak(factors.hour, 7.2, 1.1) * 0.42;
    const eveningUse = peak(factors.hour, 19.5, 1.65) * 0.48;
    const utilityBase = zone.id === "south" ? 0.38 : 0;
    return metricProfile.base * zoneProfile.water * (0.62 + morningUse + eveningUse + utilityBase);
  }

  if (metric === "noiseDb") {
    const trafficNoise = factors.commute * 10 * zoneProfile.traffic;
    const workNoise = factors.businessHours * 8 * (zone.id === "east" ? 1.4 : 1);
    const lateNight = factors.hour >= 22 || factors.hour <= 5 ? -8 : 0;
    return metricProfile.base * zoneProfile.noise + trafficNoise + workNoise + lateNight;
  }

  if (metric === "pm25") {
    const trafficPollution = factors.commute * 12 * zoneProfile.traffic;
    const industrialPollution = zone.id === "east" ? factors.industrialShift * 24 : 0;
    const stagnantAir = factors.hour <= 8 ? 8 : factors.hour >= 20 ? 5 : 0;
    return metricProfile.base * zoneProfile.air + trafficPollution + industrialPollution + stagnantAir;
  }

  return threshold * 0.68;
}

function sensorValue(zone, metric, date) {
  const profile = metricProfiles[metric];
  const zoneProfile = zoneProfiles[zone.id] || zoneProfiles.central;
  const key = `${zone.id}:${metric}`;
  const target = baselineFor(zone, metric, date) * incidentMultiplier(zone, metric, date);
  const previous = sensorState.get(key) ?? target * (0.94 + Math.random() * 0.12);
  const drift = gaussianNoise() * profile.jitter * (1 + zoneProfile.volatility);
  const next = previous + (target - previous) * profile.response + drift;
  const clamped = clamp(next, profile.floor, profile.ceiling);

  sensorState.set(key, clamped);
  return clamped;
}

function pickSensorId(zone, metric) {
  const slot = metrics.indexOf(metric) + 1;
  return `${zone.id}-${metric}-${String(slot).padStart(2, "0")}`;
}

export function generateReading(options = {}) {
  const now = floorToMinute(options.recordedAt ? new Date(options.recordedAt) : new Date());
  const zone = options.zoneId
    ? zones.find((item) => item.id === options.zoneId) || zones[0]
    : zones[Math.floor(Math.random() * zones.length)];
  const metric = options.metric || metrics[Math.floor(Math.random() * metrics.length)];
  const value = sensorValue(zone, metric, now);

  return {
    sensorId: pickSensorId(zone, metric),
    zoneId: zone.id,
    metric,
    value: Number(value.toFixed(metric === "waterLitres" || metric === "electricityKw" ? 0 : 1)),
    unit: metricUnits[metric],
    recordedAt: now,
    source: "simulator"
  };
}

export function startSimulator({ intervalMs, onReading }) {
  const snapshotIntervalMs = Number(intervalMs) || defaultSimulationIntervalMs;

  function emitSnapshot() {
    const now = floorToMinute(new Date());

    for (const zone of zones) {
      for (const metric of metrics) {
        Promise.resolve(onReading(generateReading({ zoneId: zone.id, metric, recordedAt: now }))).catch(console.error);
      }
    }
  }

  emitSnapshot();
  const timer = setInterval(emitSnapshot, snapshotIntervalMs);

  return () => clearInterval(timer);
}
