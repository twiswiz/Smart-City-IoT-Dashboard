// Major Indian cities monitored by the UrbanSignal IoT grid.
// Each entry represents a metropolitan command zone (still keyed under the
// `zoneId` API field for backwards compatibility with the storage layer).
// Thresholds reflect Indian context:
//   - PM2.5 follows the CPCB NAAQS 24-hr standard (60 ug/m3) tightened or
//     relaxed slightly per city based on chronic exposure and AQI baselines.
//   - Noise follows the Noise Pollution Rules 2000 daytime category mix
//     (residential 55, commercial 65, industrial 75 dB(A)) padded for
//     arterial monitoring stations.
//   - Traffic, power, and water thresholds correspond to a representative
//     trunk feeder / corridor inside each city, not the city total.
export const zones = [
  {
    id: "delhi",
    name: "Delhi NCT",
    type: "Capital Region",
    state: "Delhi",
    population: 16800000,
    timezone: "Asia/Kolkata",
    color: "#ef4444",
    position: { x: 46, y: 22 },
    thresholds: {
      trafficFlow: 1100,
      pm25: 90,
      electricityKw: 7400,
      waterLitres: 240000,
      noiseDb: 78
    }
  },
  {
    id: "mumbai",
    name: "Mumbai",
    type: "Coastal Megacity",
    state: "Maharashtra",
    population: 12500000,
    timezone: "Asia/Kolkata",
    color: "#0ea5e9",
    position: { x: 22, y: 60 },
    thresholds: {
      trafficFlow: 1250,
      pm25: 65,
      electricityKw: 6900,
      waterLitres: 285000,
      noiseDb: 82
    }
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    type: "Tech Hub",
    state: "Karnataka",
    population: 8500000,
    timezone: "Asia/Kolkata",
    color: "#16a34a",
    position: { x: 44, y: 80 },
    thresholds: {
      trafficFlow: 980,
      pm25: 55,
      electricityKw: 5800,
      waterLitres: 175000,
      noiseDb: 74
    }
  },
  {
    id: "chennai",
    name: "Chennai",
    type: "Coastal IT Corridor",
    state: "Tamil Nadu",
    population: 7100000,
    timezone: "Asia/Kolkata",
    color: "#7c3aed",
    position: { x: 56, y: 84 },
    thresholds: {
      trafficFlow: 820,
      pm25: 55,
      electricityKw: 5400,
      waterLitres: 198000,
      noiseDb: 73
    }
  },
  {
    id: "kolkata",
    name: "Kolkata",
    type: "Eastern Metro",
    state: "West Bengal",
    population: 4500000,
    timezone: "Asia/Kolkata",
    color: "#f59e0b",
    position: { x: 78, y: 42 },
    thresholds: {
      trafficFlow: 760,
      pm25: 75,
      electricityKw: 4600,
      waterLitres: 168000,
      noiseDb: 76
    }
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    type: "Tech City",
    state: "Telangana",
    population: 7000000,
    timezone: "Asia/Kolkata",
    color: "#0891b2",
    position: { x: 50, y: 64 },
    thresholds: {
      trafficFlow: 880,
      pm25: 60,
      electricityKw: 5400,
      waterLitres: 165000,
      noiseDb: 72
    }
  },
  {
    id: "pune",
    name: "Pune",
    type: "Education & Auto Hub",
    state: "Maharashtra",
    population: 3100000,
    timezone: "Asia/Kolkata",
    color: "#db2777",
    position: { x: 27, y: 64 },
    thresholds: {
      trafficFlow: 780,
      pm25: 60,
      electricityKw: 4100,
      waterLitres: 138000,
      noiseDb: 72
    }
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    type: "Industrial Belt",
    state: "Gujarat",
    population: 5600000,
    timezone: "Asia/Kolkata",
    color: "#ca8a04",
    position: { x: 24, y: 42 },
    thresholds: {
      trafficFlow: 720,
      pm25: 70,
      electricityKw: 5100,
      waterLitres: 142000,
      noiseDb: 75
    }
  }
];

export const metricLabels = {
  trafficFlow: "Traffic Flow",
  pm25: "PM2.5",
  electricityKw: "Electricity",
  waterLitres: "Water Usage",
  noiseDb: "Noise"
};

export const metricUnits = {
  trafficFlow: "vehicles/hr",
  pm25: "ug/m3",
  electricityKw: "kW",
  waterLitres: "L/hr",
  noiseDb: "dB"
};
