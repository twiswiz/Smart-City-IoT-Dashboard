export const zones = [
  {
    id: "central",
    name: "Central Business District",
    type: "Commercial",
    population: 128000,
    color: "#2563eb",
    position: { x: 48, y: 42 },
    thresholds: {
      trafficFlow: 780,
      pm25: 70,
      electricityKw: 4400,
      waterLitres: 145000,
      noiseDb: 78
    }
  },
  {
    id: "north",
    name: "North Residential",
    type: "Residential",
    population: 216000,
    color: "#16a34a",
    position: { x: 38, y: 22 },
    thresholds: {
      trafficFlow: 520,
      pm25: 55,
      electricityKw: 3200,
      waterLitres: 178000,
      noiseDb: 68
    }
  },
  {
    id: "east",
    name: "East Industrial",
    type: "Industrial",
    population: 92000,
    color: "#f97316",
    position: { x: 72, y: 46 },
    thresholds: {
      trafficFlow: 680,
      pm25: 90,
      electricityKw: 6100,
      waterLitres: 132000,
      noiseDb: 84
    }
  },
  {
    id: "south",
    name: "South Utilities",
    type: "Utility",
    population: 76000,
    color: "#0891b2",
    position: { x: 50, y: 72 },
    thresholds: {
      trafficFlow: 460,
      pm25: 60,
      electricityKw: 5200,
      waterLitres: 210000,
      noiseDb: 73
    }
  },
  {
    id: "west",
    name: "West Transit Corridor",
    type: "Transit",
    population: 118000,
    color: "#7c3aed",
    position: { x: 20, y: 52 },
    thresholds: {
      trafficFlow: 900,
      pm25: 65,
      electricityKw: 2800,
      waterLitres: 99000,
      noiseDb: 82
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
