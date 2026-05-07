import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";
import { startDatasetPlayer } from "./datasetPlayer.js";
import { startMqttClient } from "./mqttClient.js";
import { createRoutes } from "./routes.js";
import { seedHistory } from "./seedHistory.js";
import { startSimulator } from "./simulator.js";
import { initStorage } from "./storage.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.clientOrigin,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

const storage = await initStorage(config.mongoUri);
const { router, ingest } = createRoutes(io);

app.use("/api", router);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    storage: storage.mode,
    dataSource: config.dataSource,
    datasetPath: config.dataSource === "dataset" ? config.datasetPath : null,
    timestamp: new Date().toISOString()
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

io.on("connection", (socket) => {
  socket.emit("status", { connected: true, storage: storage.mode });
});

startMqttClient({
  brokerUrl: config.mqttBrokerUrl,
  topic: config.mqttTopic,
  onReading: ingest
});

if (config.dataSource === "dataset") {
  startDatasetPlayer({
    datasetPath: config.datasetPath,
    intervalMs: config.datasetReplayIntervalMs,
    loop: config.datasetLoop,
    onReading: ingest
  });
} else {
  if (config.seedHistoryDays > 0) {
    console.log(
      `Seeding ${config.seedHistoryDays}d of synthetic history at ${config.seedHistoryStepMinutes}-min granularity (storage: ${storage.mode})...`
    );
    const summary = await seedHistory({
      days: config.seedHistoryDays,
      stepMinutes: config.seedHistoryStepMinutes,
      force: config.seedHistoryForce
    });
    if (summary.skipped) {
      console.log(`History seed skipped: ${summary.existing} readings already present.`);
    } else {
      console.log(
        `History seed complete: ${summary.inserted} readings, ${summary.alerts} alerts.`
      );
    }
  }
  startSimulator({
    intervalMs: config.simulationIntervalMs,
    onReading: ingest
  });
}

server.listen(config.port, () => {
  console.log(`Smart City API running on http://localhost:${config.port}`);
  console.log(`Storage mode: ${storage.mode}`);
  console.log(`Data source: ${config.dataSource}`);
});
