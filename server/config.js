export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "",
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || "",
  mqttTopic: process.env.MQTT_TOPIC || "smart-city-iot-dashboard/readings",
  simulationIntervalMs: Number(process.env.SIMULATION_INTERVAL_MS || 2500)
};
