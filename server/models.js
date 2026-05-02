import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    sensorId: { type: String, required: true },
    zoneId: { type: String, required: true, index: true },
    metric: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    recordedAt: { type: Date, required: true, index: true },
    source: { type: String, default: "simulator" }
  },
  {
    timeseries: {
      timeField: "recordedAt",
      metaField: "sensorId",
      granularity: "seconds"
    }
  }
);

const alertSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, index: true },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    severity: { type: String, enum: ["warning", "critical"], required: true },
    message: { type: String, required: true },
    recordedAt: { type: Date, required: true, index: true },
    acknowledged: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const zoneConfigSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    population: Number,
    color: String,
    position: {
      x: Number,
      y: Number
    },
    thresholds: {
      trafficFlow: Number,
      pm25: Number,
      electricityKw: Number,
      waterLitres: Number,
      noiseDb: Number
    }
  },
  { timestamps: true }
);

export const Reading = mongoose.models.Reading || mongoose.model("Reading", readingSchema);
export const Alert = mongoose.models.Alert || mongoose.model("Alert", alertSchema);
export const ZoneConfig =
  mongoose.models.ZoneConfig || mongoose.model("ZoneConfig", zoneConfigSchema);
