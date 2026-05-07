import { metricUnits, zones } from "./data/zones.js";

// Smart-city simulator tuned for major Indian metros.
//
// Each city has an idiosyncratic profile (Delhi smog, Mumbai gridlock,
// Bengaluru tech-corridor traffic, Chennai water stress, etc.). Readings
// are produced as smoothly evolving time series, layered with:
//   - diurnal rush hours and lunch dips
//   - weekday vs weekend modulation
//   - Indian seasonal pattern (winter inversion smog, summer AC peak,
//     monsoon rain washout)
//   - random sustained incidents (jams, fires, line trips, leaks)
//   - per-sensor offsets so duplicate sensors in the same zone read
//     slightly differently, like real instruments do.

const metrics = ["trafficFlow", "pm25", "electricityKw", "waterLitres", "noiseDb"];
const defaultSimulationIntervalMs = 15_000;

// City profiles. Multipliers are applied on top of the metric base
// envelope. `sensors` is the number of physical instruments per metric.
const zoneProfiles = {
  delhi: {
    traffic: 1.55,
    air: 2.05,
    power: 1.46,
    water: 0.96,
    noise: 1.22,
    volatility: 0.11,
    sensors: 4
  },
  mumbai: {
    traffic: 1.62,
    air: 1.14,
    power: 1.42,
    water: 1.18,
    noise: 1.32,
    volatility: 0.1,
    sensors: 4
  },
  bengaluru: {
    traffic: 1.48,
    air: 0.92,
    power: 1.32,
    water: 0.88,
    noise: 1.06,
    volatility: 0.08,
    sensors: 4
  },
  chennai: {
    traffic: 1.18,
    air: 0.94,
    power: 1.28,
    water: 1.34,
    noise: 1.04,
    volatility: 0.09,
    sensors: 3
  },
  kolkata: {
    traffic: 1.04,
    air: 1.34,
    power: 1.08,
    water: 1.06,
    noise: 1.14,
    volatility: 0.09,
    sensors: 3
  },
  hyderabad: {
    traffic: 1.22,
    air: 0.98,
    power: 1.3,
    water: 0.94,
    noise: 1.02,
    volatility: 0.08,
    sensors: 3
  },
  pune: {
    traffic: 1.18,
    air: 1.04,
    power: 1.04,
    water: 0.98,
    noise: 1.02,
    volatility: 0.08,
    sensors: 3
  },
  ahmedabad: {
    traffic: 0.98,
    air: 1.36,
    power: 1.28,
    water: 0.78,
    noise: 1.08,
    volatility: 0.09,
    sensors: 3
  }
};

// Metric base envelopes (Indian-arterial scale).
// Bases are tuned so a busy weekday rush hour pushes a high-load city
// (Delhi/Mumbai) to roughly 95-110% of its threshold, with frequent
// off-peak readings landing 50-75% of threshold so the dashboard
// always shows movement instead of dead-flat lines well below limits.
const metricProfiles = {
  trafficFlow: { base: 760, floor: 90, ceiling: 1900, jitter: 28, response: 0.32 },
  pm25: { base: 58, floor: 12, ceiling: 480, jitter: 2.6, response: 0.22 },
  electricityKw: { base: 4100, floor: 900, ceiling: 9400, jitter: 95, response: 0.24 },
  waterLitres: { base: 152000, floor: 38000, ceiling: 340000, jitter: 2600, response: 0.22 },
  noiseDb: { base: 64, floor: 36, ceiling: 104, jitter: 1.5, response: 0.28 }
};

const sensorState = new Map();
const incidentState = new Map();
const sensorOffsets = new Map();

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

// Indian seasonal modifiers based on month-of-year.
function seasonFactors(date, zoneId) {
  const month = date.getMonth();
  const yearPhase = (month + date.getDate() / 31) / 12;
  const winterSmog = Math.max(0, Math.cos((yearPhase - 0.05) * 2 * Math.PI));
  const summerHeat = Math.max(0, Math.cos((yearPhase - 0.42) * 2 * Math.PI));
  const monsoon = Math.max(0, Math.cos((yearPhase - 0.62) * 2 * Math.PI));

  const northBoost = ["delhi", "kolkata", "ahmedabad"].includes(zoneId) ? 1.6 : 1.0;
  const coastalBoost = ["mumbai", "chennai", "kolkata"].includes(zoneId) ? 1.4 : 1.0;
  const summerBoost = ["delhi", "ahmedabad", "hyderabad"].includes(zoneId) ? 1.35 : 1.0;

  return {
    pm25: Math.max(0.4, 1 + winterSmog * 0.85 * northBoost - monsoon * 0.35),
    electricityKw: 1 + summerHeat * 0.32 * summerBoost + winterSmog * 0.06,
    waterLitres: 1 + summerHeat * 0.18 + monsoon * 0.22 * coastalBoost,
    trafficFlow: Math.max(0.5, 1 - monsoon * 0.12 * coastalBoost),
    noiseDb: 1 + monsoon * 0.04
  };
}

function dailyFactors(date) {
  const hour = hourOfDay(date);
  const weekend = isWeekend(date);
  // Wider peaks (sigma 1.6-1.9 hr) so 10-min sampling catches them and
  // peak loads sustain for more than a single tick.
  const morningRush = peak(hour, weekend ? 10.6 : 9.0, weekend ? 1.7 : 1.6);
  const eveningRush = peak(hour, weekend ? 19.4 : 18.6, weekend ? 1.85 : 1.75);
  const lunch = peak(hour, 13.4, 1.45);
  const nightQuiet = hour < 5 || hour > 23.5 ? 0.48 : 1;
  const businessHours = weekend ? daytime(hour) * 0.7 : clamp(daytime(hour) * 1.22, 0, 1.18);
  const residentialEvening = peak(hour, 20.6, 1.85);
  const residentialMorning = peak(hour, 7.4, 1.2);

  return {
    hour,
    weekend,
    commute: weekend ? 0.6 * morningRush + 0.78 * eveningRush : morningRush + eveningRush,
    lunch,
    nightQuiet,
    businessHours,
    residential: residentialMorning + residentialEvening,
    industrialShift: weekend ? 0.7 : hour >= 6 && hour <= 22 ? 1 : 0.78
  };
}

function incidentMultiplier(zone, metric, now) {
  const key = `${zone.id}:${metric}`;
  const current = incidentState.get(key);

  if (current && current.expiresAt > now.getTime()) {
    return current.multiplier;
  }

  if (current) incidentState.delete(key);

  const base = {
    trafficFlow: 0.0045,
    pm25: 0.0035,
    electricityKw: 0.0025,
    waterLitres: 0.0025,
    noiseDb: 0.003
  }[metric];

  const cityBias = {
    delhi: { trafficFlow: 1.6, pm25: 2.0, electricityKw: 1.4, waterLitres: 1.0, noiseDb: 1.3 },
    mumbai: { trafficFlow: 2.0, pm25: 1.1, electricityKw: 1.4, waterLitres: 1.6, noiseDb: 1.4 },
    bengaluru: { trafficFlow: 1.9, pm25: 0.8, electricityKw: 1.3, waterLitres: 1.0, noiseDb: 1.1 },
    chennai: { trafficFlow: 1.2, pm25: 0.9, electricityKw: 1.2, waterLitres: 1.6, noiseDb: 1.0 },
    kolkata: { trafficFlow: 1.3, pm25: 1.5, electricityKw: 1.2, waterLitres: 1.1, noiseDb: 1.2 },
    hyderabad: { trafficFlow: 1.2, pm25: 0.9, electricityKw: 1.2, waterLitres: 1.0, noiseDb: 1.0 },
    pune: { trafficFlow: 1.3, pm25: 1.0, electricityKw: 1.0, waterLitres: 1.0, noiseDb: 1.1 },
    ahmedabad: { trafficFlow: 1.1, pm25: 1.5, electricityKw: 1.3, waterLitres: 0.9, noiseDb: 1.1 }
  }[zone.id] || {};

  const incidentChance = base * (cityBias[metric] || 1);
  if (Math.random() > incidentChance) return 1;

  const multiplier = {
    trafficFlow: 1.32 + Math.random() * 0.36,
    pm25: 1.25 + Math.random() * 0.55,
    electricityKw: 1.14 + Math.random() * 0.22,
    waterLitres: 1.16 + Math.random() * 0.3,
    noiseDb: 1.12 + Math.random() * 0.2
  }[metric];

  incidentState.set(key, {
    multiplier,
    expiresAt: now.getTime() + (8 * 60_000 + Math.random() * 37 * 60_000)
  });

  return multiplier;
}

function baselineFor(zone, metric, date) {
  const factors = dailyFactors(date);
  const zoneProfile = zoneProfiles[zone.id] || zoneProfiles.delhi;
  const metricProfile = metricProfiles[metric];
  const seasonal = seasonFactors(date, zone.id);

  if (metric === "trafficFlow") {
    const commuteLoad = 0.7 + factors.commute * 0.85 + factors.lunch * 0.18;
    const weekendAdjustment = factors.weekend ? 0.78 : 1;
    return (
      metricProfile.base *
      zoneProfile.traffic *
      commuteLoad *
      factors.nightQuiet *
      weekendAdjustment *
      seasonal.trafficFlow
    );
  }

  if (metric === "electricityKw") {
    const commercialLoad = 0.58 + factors.businessHours * 0.78;
    const residentialEvening = factors.residential * 0.22;
    const techAlwaysOn = ["bengaluru", "hyderabad", "chennai", "pune"].includes(zone.id) ? 0.32 : 0;
    const industrialLoad = ["ahmedabad", "delhi", "mumbai"].includes(zone.id)
      ? factors.industrialShift * 0.38
      : 0;
    return (
      metricProfile.base *
      zoneProfile.power *
      (commercialLoad + residentialEvening + techAlwaysOn + industrialLoad) *
      seasonal.electricityKw
    );
  }

  if (metric === "waterLitres") {
    const morningUse = peak(factors.hour, 7.4, 1.15) * 0.46;
    const eveningUse = peak(factors.hour, 19.7, 1.65) * 0.52;
    const utilityBase = ["chennai", "mumbai", "kolkata"].includes(zone.id) ? 0.42 : 0.18;
    return (
      metricProfile.base *
      zoneProfile.water *
      (0.6 + morningUse + eveningUse + utilityBase) *
      seasonal.waterLitres
    );
  }

  if (metric === "noiseDb") {
    const trafficNoise = factors.commute * 11 * zoneProfile.traffic;
    const workNoise = factors.businessHours * 7 * (zone.id === "ahmedabad" ? 1.3 : 1);
    const lateNight = factors.hour >= 22.5 || factors.hour <= 5 ? -10 : 0;
    return (
      metricProfile.base * zoneProfile.noise * seasonal.noiseDb +
      trafficNoise +
      workNoise +
      lateNight
    );
  }

  if (metric === "pm25") {
    const trafficPollution = factors.commute * 14 * zoneProfile.traffic;
    const industrialPollution = ["ahmedabad", "delhi", "kolkata"].includes(zone.id)
      ? factors.industrialShift * 22
      : 0;
    const stagnantAir = factors.hour <= 8 ? 9 : factors.hour >= 20 ? 6 : 0;
    return (
      (metricProfile.base * zoneProfile.air + trafficPollution + industrialPollution + stagnantAir) *
      seasonal.pm25
    );
  }

  return zone.thresholds[metric] * 0.7;
}

function getSensorOffset(zone, metric, sensorIdx) {
  const key = `${zone.id}:${metric}:${sensorIdx}`;
  let offset = sensorOffsets.get(key);
  if (offset === undefined) {
    offset = 1 + (Math.random() - 0.5) * 0.16;
    sensorOffsets.set(key, offset);
  }
  return offset;
}

function sensorValue(zone, metric, date, sensorIdx) {
  const profile = metricProfiles[metric];
  const zoneProfile = zoneProfiles[zone.id] || zoneProfiles.delhi;
  const stateKey = `${zone.id}:${metric}:${sensorIdx}`;
  const offset = getSensorOffset(zone, metric, sensorIdx);
  const target = baselineFor(zone, metric, date) * incidentMultiplier(zone, metric, date) * offset;
  const previous = sensorState.get(stateKey) ?? target * (0.92 + Math.random() * 0.16);
  const drift = gaussianNoise() * profile.jitter * (1 + zoneProfile.volatility);
  const next = previous + (target - previous) * profile.response + drift;
  const clamped = clamp(next, profile.floor, profile.ceiling);

  sensorState.set(stateKey, clamped);
  return clamped;
}

function sensorCount(zone, metric) {
  const zoneProfile = zoneProfiles[zone.id] || zoneProfiles.delhi;
  const bonus = metric === "trafficFlow" || metric === "pm25" ? 1 : 0;
  return Math.max(1, (zoneProfile.sensors || 3) - (metric === "noiseDb" ? 1 : 0) + bonus);
}

function pickSensorId(zone, metric, sensorIdx) {
  const slot = String(sensorIdx + 1).padStart(2, "0");
  const stationCode = {
    trafficFlow: "tf",
    pm25: "aq",
    electricityKw: "pw",
    waterLitres: "wm",
    noiseDb: "nz"
  }[metric] || "snr";
  return `${zone.id}-${stationCode}-${slot}`;
}

export function generateReading(options = {}) {
  // For seeded history we keep timestamps quantized to the step;
  // for live ticks we use the real timestamp so each reading is
  // distinct on the timeline.
  const baseTime = options.recordedAt ? new Date(options.recordedAt) : new Date();
  const now = options.source === "history" ? floorToMinute(baseTime) : baseTime;
  const zone = options.zoneId
    ? zones.find((item) => item.id === options.zoneId) || zones[0]
    : zones[Math.floor(Math.random() * zones.length)];
  const metric = options.metric || metrics[Math.floor(Math.random() * metrics.length)];
  const sensorIdx =
    typeof options.sensorIndex === "number"
      ? options.sensorIndex
      : Math.floor(Math.random() * sensorCount(zone, metric));
  const value = sensorValue(zone, metric, now, sensorIdx);
  const decimals = metric === "waterLitres" || metric === "electricityKw" ? 0 : 1;

  return {
    sensorId: pickSensorId(zone, metric, sensorIdx),
    zoneId: zone.id,
    metric,
    value: Number(value.toFixed(decimals)),
    unit: metricUnits[metric],
    recordedAt: now,
    source: options.source || "simulator"
  };
}

export function startSimulator({ intervalMs, onReading }) {
  const snapshotIntervalMs = Number(intervalMs) || defaultSimulationIntervalMs;

  function emitSnapshot() {
    let staggerMs = 0;
    for (const zone of zones) {
      for (const metric of metrics) {
        const total = sensorCount(zone, metric);
        for (let sensorIdx = 0; sensorIdx < total; sensorIdx += 1) {
          // Stagger sensor timestamps within the snapshot so two
          // sensors don't share the exact same Date and the live
          // chart shows a smooth stream rather than vertical clusters.
          const recordedAt = new Date(Date.now() + staggerMs);
          staggerMs += 1;
          Promise.resolve(
            onReading(
              generateReading({
                zoneId: zone.id,
                metric,
                recordedAt,
                sensorIndex: sensorIdx
              })
            )
          ).catch(console.error);
        }
      }
    }
  }

  emitSnapshot();
  const timer = setInterval(emitSnapshot, snapshotIntervalMs);

  return () => clearInterval(timer);
}

export function forEachSensor(callback) {
  for (const zone of zones) {
    for (const metric of metrics) {
      const total = sensorCount(zone, metric);
      for (let sensorIdx = 0; sensorIdx < total; sensorIdx += 1) {
        callback({ zone, metric, sensorIdx });
      }
    }
  }
}
