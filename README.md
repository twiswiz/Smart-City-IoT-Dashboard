# Smart-City-IoT-Dashboard

## Abstract

A city-wide operational dashboard that ingests sensor data streams from IoT devices such as traffic sensors, air quality monitors, and utility meters. Real-time charts visualise metrics across city zones, and automated alerts fire when thresholds are exceeded. City officials can drill into zone-level detail, compare historical trends, and export compliance reports. The system handles high-frequency data ingestion and efficient time-series queries.

## Tools and Technologies

- MongoDB: Time-series collections for sensor readings, alert records, and zone configurations
- Express.js: Sensor data ingestion API, threshold alert engine, and report export endpoints
- React JS: Live dashboard with Chart.js visualisations, city zone map, and alert feed
- Node.js: MQTT client for real-time sensor data subscription and Socket.io for dashboard updates
- JSP: Compliance report and zone summary printout pages for official submissions

## Features

- Simulated IoT streams from traffic sensors, air quality monitors, and utility meters
- Express.js ingestion API for sensor readings
- MongoDB time-series schemas for readings, alerts, and zone configurations
- Threshold alert engine with alert records
- Socket.io live dashboard updates
- MQTT client support plus built-in simulator
- React dashboard with Chart.js visualisations, city zone map, alert feed, historical trends, and exports
- JSP compliance report and zone summary page templates

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

MongoDB is used when `MONGODB_URI` is available. If MongoDB is not running, the app falls back to in-memory storage so the demo can still run.

## API

- `POST /api/readings` ingest one sensor reading
- `GET /api/readings?zoneId=central&metric=trafficFlow&range=24h` query time-series readings
- `GET /api/zones` list zones and thresholds
- `GET /api/alerts` list alert records
- `GET /api/reports/compliance?zoneId=central&range=7d` export compliance report JSON
- `GET /api/reports/compliance.csv?zoneId=central&range=7d` export CSV

## JSP Pages

JSP templates are in `jsp/` for official printouts:

- `compliance-report.jsp`
- `zone-summary.jsp`
