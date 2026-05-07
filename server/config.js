import fs from "fs";
import path from "path";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart_city_iot",
  dataSource: process.env.DATA_SOURCE || "simulator",
  datasetPath: process.env.DATASET_PATH || "server/data/readings.csv",
  datasetReplayIntervalMs: Number(process.env.DATASET_REPLAY_INTERVAL_MS || 5000),
  datasetLoop: process.env.DATASET_LOOP !== "false",
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || "",
  mqttTopic: process.env.MQTT_TOPIC || "smart-city-iot-dashboard/readings",
  simulationIntervalMs: Number(process.env.SIMULATION_INTERVAL_MS || 15_000),
  seedHistoryDays: Number(process.env.SEED_HISTORY_DAYS ?? 7),
  seedHistoryStepMinutes: Number(process.env.SEED_HISTORY_STEP_MINUTES ?? 10),
  seedHistoryForce: process.env.SEED_HISTORY_FORCE === "true"
};
