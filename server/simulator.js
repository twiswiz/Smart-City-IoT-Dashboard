import { metricUnits, zones } from "./data/zones.js";

const profiles = {
  trafficFlow: { min: 160, max: 960 },
  pm25: { min: 18, max: 104 },
  electricityKw: { min: 1200, max: 6500 },
  waterLitres: { min: 52000, max: 225000 },
  noiseDb: { min: 42, max: 92 }
};

function wave(amplitude = 1) {
  return Math.sin(Date.now() / 25000) * amplitude;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function generateReading() {
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const metric = Object.keys(profiles)[Math.floor(Math.random() * Object.keys(profiles).length)];
  const profile = profiles[metric];
  const rushHourBoost = metric === "trafficFlow" ? wave(140) : 0;
  const industrialBoost = zone.id === "east" && ["pm25", "noiseDb", "electricityKw"].includes(metric) ? 1.15 : 1;
  const value = Math.max(profile.min, randomBetween(profile.min, profile.max) * industrialBoost + rushHourBoost);

  return {
    sensorId: `${zone.id}-${metric}-01`,
    zoneId: zone.id,
    metric,
    value: Number(value.toFixed(2)),
    unit: metricUnits[metric],
    recordedAt: new Date(),
    source: "simulator"
  };
}

export function startSimulator({ intervalMs, onReading }) {
  const timer = setInterval(() => {
    const burstSize = 4;
    for (let index = 0; index < burstSize; index += 1) {
      onReading(generateReading());
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
