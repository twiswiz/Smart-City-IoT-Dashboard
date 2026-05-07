# Smart-City-IoT-Dashboard

## Abstract

A nationwide operations dashboard that ingests sensor streams from IoT devices (traffic counters, air-quality monitors, utility meters, noise sensors) installed across **eight major Indian metros** — Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, and Ahmedabad. Real-time charts visualise metrics across cities, and automated alerts fire when CPCB / municipal thresholds are exceeded. Officials can drill into city-level detail, compare historical trends, and export compliance reports. The system handles high-frequency data ingestion and efficient time-series queries.

## Tools and Technologies

- MongoDB: Time-series collections for sensor readings, alert records, and city configurations
- Express.js: Sensor data ingestion API, threshold alert engine, and report export endpoints
- React JS: Live dashboard with Chart.js visualisations, India city map, and alert feed
- Node.js: MQTT client for real-time sensor data subscription and Socket.io for dashboard updates
- JSP: Compliance report and city summary printout pages for official submissions

## Features

- Simulated IoT streams for **8 Indian cities** with realistic per-city profiles (Delhi smog, Mumbai gridlock, Bengaluru tech corridor, Chennai water stress, etc.)
- Diurnal rush-hour curves, weekend modulation, and **Indian seasonal patterns** (winter inversion smog, summer AC peak, SW monsoon)
- Sustained random incidents (jams, fires, line trips, leaks) layered onto baselines
- Multiple physical sensors per metric per city, each with stable per-instrument bias
- 7-day historical backfill seeded on startup so charts are populated immediately
- Express.js ingestion API for sensor readings
- MongoDB time-series schemas for readings, alerts, and city configurations
- Threshold alert engine (CPCB-aligned) with alert records
- Socket.io live dashboard updates
- MQTT client support plus built-in simulator
- React dashboard with Chart.js visualisations, India map, alert feed, historical trends, and exports
- JSP compliance report and city summary page templates

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

MongoDB is used when `MONGODB_URI` is available. If MongoDB is not running, the app falls back to in-memory storage so the demo can still run.

Create a `.env` file from `.env.example` to configure the API. By default the simulator publishes one complete city snapshot every minute and seeds 7 days of synthetic history at 10-minute granularity on startup:

```bash
SIMULATION_INTERVAL_MS=60000
SEED_HISTORY_DAYS=7
SEED_HISTORY_STEP_MINUTES=10
```

To use real dataset playback instead of generated simulation data, set:

```bash
DATA_SOURCE=dataset
DATASET_PATH=server/data/readings.csv
DATASET_REPLAY_INTERVAL_MS=5000
```

The dataset CSV should use this normalized format:

```csv
recordedAt,sensorId,zoneId,metric,value,unit
2026-05-07T09:00:00Z,delhi-aq-01,delhi,pm25,148.6,ug/m3
```

Supported `zoneId` values are `delhi`, `mumbai`, `bengaluru`, `chennai`, `kolkata`, `hyderabad`, `pune`, and `ahmedabad`.
Supported `metric` values are `trafficFlow`, `pm25`, `electricityKw`, `waterLitres`, and `noiseDb`.

Good real-world sources to convert into this format include CPCB's open AQ archive, Indian city open-data feeds, and the UCI Air Quality dataset. If the source only contains one metric, keep the other dashboard metrics disabled or load additional public datasets for those signals.

## API

- `POST /api/readings` ingest one sensor reading
- `GET /api/readings?zoneId=delhi&metric=trafficFlow&range=24h` query time-series readings
- `GET /api/zones` list cities and thresholds
- `GET /api/alerts` list alert records
- `GET /api/reports/compliance?zoneId=delhi&range=7d` export compliance report JSON
- `GET /api/reports/compliance.csv?zoneId=delhi&range=7d` export CSV

## JSP Pages

JSP templates are in `jsp/` for official printouts:

- `compliance-report.jsp`
- `zone-summary.jsp` (city summary printout)
