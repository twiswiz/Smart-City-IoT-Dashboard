# Smart-City-IoT-Dashboard

Abstract

A city-wide operational dashboard that ingests sensor data streams from IoT devices such as traffic sensors, air quality monitors, and utility meters. Real-time charts visualise metrics across city zones, and automated alerts fire when thresholds are exceeded. City officials can drill into zone-level detail, compare historical trends, and export compliance reports. The system handles high-frequency data ingestion and efficient time-series queries.

Tools and Technologies

• MongoDB: Time-series collections for sensor readings, alert records, and zone configurations

• Express.js: Sensor data ingestion API, threshold alert engine, and report export endpoints

• React JS: Live dashboard with Chart.js visualisations, city zone map, and alert feed

• Node.js: MQTT client for real-time sensor data subscription and Socket.io for dashboard updates

• JSP: Compliance report and zone summary printout pages for official submissions
