import mqtt from "mqtt";

export function startMqttClient({ brokerUrl, topic, onReading }) {
  if (!brokerUrl) return null;

  const client = mqtt.connect(brokerUrl, {
    reconnectPeriod: 5000,
    connectTimeout: 5000
  });

  client.on("connect", () => {
    client.subscribe(topic);
    console.log(`MQTT subscribed to ${topic}`);
  });

  client.on("message", (_topic, payload) => {
    try {
      const reading = JSON.parse(payload.toString());
      onReading({ ...reading, source: "mqtt" });
    } catch (error) {
      console.warn("Ignored invalid MQTT reading:", error.message);
    }
  });

  client.on("error", (error) => {
    console.warn("MQTT error:", error.message);
  });

  return client;
}
