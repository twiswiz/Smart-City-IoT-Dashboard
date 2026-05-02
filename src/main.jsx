import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { io } from "socket.io-client";
import "./styles.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
);

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const socket = io(API_BASE, { transports: ["websocket", "polling"] });

const metricLabels = {
  trafficFlow: "Traffic Flow",
  pm25: "PM2.5",
  electricityKw: "Electricity",
  waterLitres: "Water",
  noiseDb: "Noise"
};

const metricUnits = {
  trafficFlow: "vehicles/hr",
  pm25: "ug/m3",
  electricityKw: "kW",
  waterLitres: "L/hr",
  noiseDb: "dB"
};

const metricColors = {
  trafficFlow: "#2563eb",
  pm25: "#dc2626",
  electricityKw: "#ca8a04",
  waterLitres: "#0891b2",
  noiseDb: "#7c3aed"
};

function compactNumber(value) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

function App() {
  const [zones, setZones] = useState([]);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("trafficFlow");
  const [range, setRange] = useState("24h");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      const [zoneData, readingData, alertData] = await Promise.all([
        getJson("/api/zones"),
        getJson(`/api/readings?range=${range}&limit=260`),
        getJson(`/api/alerts?range=${range}&limit=80`)
      ]);
      setZones(zoneData);
      setReadings(readingData.reverse());
      setAlerts(alertData);
    }

    loadInitialData().catch(console.error);
  }, [range]);

  useEffect(() => {
    const handleReading = (reading) => {
      setReadings((current) => [...current.slice(-319), reading]);
    };
    const handleAlert = (alert) => {
      setAlerts((current) => [alert, ...current.slice(0, 79)]);
    };
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reading", handleReading);
    socket.on("alert", handleAlert);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reading", handleReading);
      socket.off("alert", handleAlert);
    };
  }, []);

  const filteredReadings = useMemo(
    () =>
      readings.filter((reading) => {
        const zoneMatch = selectedZone === "all" || reading.zoneId === selectedZone;
        return zoneMatch && reading.metric === selectedMetric;
      }),
    [readings, selectedMetric, selectedZone]
  );

  const latestByMetric = useMemo(() => {
    const latest = {};
    readings.forEach((reading) => {
      if (selectedZone !== "all" && reading.zoneId !== selectedZone) return;
      latest[reading.metric] = reading;
    });
    return latest;
  }, [readings, selectedZone]);

  const zoneHealth = useMemo(() => {
    return zones.map((zone) => {
      const zoneAlerts = alerts.filter((alert) => alert.zoneId === zone.id);
      const latestZoneReadings = readings.filter((reading) => reading.zoneId === zone.id).slice(-25);
      const score = Math.max(42, 100 - zoneAlerts.length * 8 - latestZoneReadings.length * 0.2);
      return { ...zone, alerts: zoneAlerts.length, score: Math.round(score) };
    });
  }, [alerts, readings, zones]);

  const lineData = {
    labels: filteredReadings.map((reading) => timeLabel(reading.recordedAt)),
    datasets: [
      {
        label: `${metricLabels[selectedMetric]} (${metricUnits[selectedMetric]})`,
        data: filteredReadings.map((reading) => reading.value),
        borderColor: metricColors[selectedMetric],
        backgroundColor: `${metricColors[selectedMetric]}1f`,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.35,
        fill: true
      }
    ]
  };

  const barData = {
    labels: zoneHealth.map((zone) => zone.name.replace(" ", "\n")),
    datasets: [
      {
        label: "Operational Health",
        data: zoneHealth.map((zone) => zone.score),
        backgroundColor: zoneHealth.map((zone) => zone.color),
        borderRadius: 5
      }
    ]
  };

  const reportQuery = `zoneId=${selectedZone}&range=${range}`;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">City Operations Center</p>
          <h1>Smart City IoT Dashboard</h1>
        </div>
        <div className="topbar-actions">
          <span className={connected ? "status online" : "status"}>{connected ? "Live" : "Offline"}</span>
          <a className="button" href={`${API_BASE}/api/reports/compliance?${reportQuery}`} target="_blank">
            JSON Report
          </a>
          <a className="button primary" href={`${API_BASE}/api/reports/compliance.csv?${reportQuery}`}>
            Export CSV
          </a>
        </div>
      </header>

      <section className="filters">
        <label>
          Zone
          <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}>
            <option value="all">All zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Metric
          <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)}>
            {Object.entries(metricLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          History
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </label>
      </section>

      <section className="metric-grid">
        {Object.entries(metricLabels).map(([metric, label]) => {
          const latest = latestByMetric[metric];
          return (
            <button
              className={selectedMetric === metric ? "metric-card active" : "metric-card"}
              key={metric}
              onClick={() => setSelectedMetric(metric)}
            >
              <span>{label}</span>
              <strong>{latest ? compactNumber(latest.value) : "--"}</strong>
              <small>{metricUnits[metric]}</small>
            </button>
          );
        })}
      </section>

      <section className="main-grid">
        <article className="panel wide">
          <div className="panel-heading">
            <div>
              <h2>Real-Time Trend</h2>
              <p>{filteredReadings.length} readings in view</p>
            </div>
            <span className="chip">{metricLabels[selectedMetric]}</span>
          </div>
          <div className="chart-wrap">
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
                  y: { beginAtZero: false, grid: { color: "#e5e7eb" } }
                }
              }}
            />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>City Zone Map</h2>
              <p>Zone-level operational state</p>
            </div>
          </div>
          <div className="city-map">
            {zoneHealth.map((zone) => (
              <button
                key={zone.id}
                className={selectedZone === zone.id ? "zone-dot selected" : "zone-dot"}
                style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%`, "--zone-color": zone.color }}
                onClick={() => setSelectedZone(zone.id)}
                title={zone.name}
              >
                <span>{zone.alerts}</span>
              </button>
            ))}
          </div>
          <div className="zone-list">
            {zoneHealth.map((zone) => (
              <button key={zone.id} onClick={() => setSelectedZone(zone.id)}>
                <i style={{ background: zone.color }} />
                <span>{zone.name}</span>
                <strong>{zone.score}%</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Alert Feed</h2>
              <p>{alerts.length} threshold events</p>
            </div>
          </div>
          <div className="alert-list">
            {alerts.length === 0 && <p className="empty">No threshold breaches yet.</p>}
            {alerts.map((alert, index) => (
              <div className={`alert ${alert.severity}`} key={`${alert.recordedAt}-${index}`}>
                <div>
                  <strong>{alert.severity}</strong>
                  <span>{alert.message}</span>
                </div>
                <time>{timeLabel(alert.recordedAt)}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="panel wide">
          <div className="panel-heading">
            <div>
              <h2>Zone Comparison</h2>
              <p>Historical operating health by zone</p>
            </div>
          </div>
          <div className="chart-wrap short">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, max: 100, grid: { color: "#e5e7eb" } }
                }
              }}
            />
          </div>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
