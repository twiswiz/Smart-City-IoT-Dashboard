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

const metricMeta = {
  trafficFlow: { icon: "route", tone: "cyan", label: "Transit" },
  pm25: { icon: "wind", tone: "coral", label: "Air" },
  electricityKw: { icon: "bolt", tone: "gold", label: "Power" },
  waterLitres: { icon: "droplet", tone: "blue", label: "Water" },
  noiseDb: { icon: "sound", tone: "violet", label: "Noise" }
};

const metricColors = {
  trafficFlow: "#0f9fb8",
  pm25: "#df4b3f",
  electricityKw: "#c88713",
  waterLitres: "#2876d1",
  noiseDb: "#7052c8"
};

const rangeLabels = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days"
};

const rangeShortLabels = {
  "1h": "1H",
  "24h": "24H",
  "7d": "7D"
};

const iconPaths = {
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="m10.3 3.9-8 13.8A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.3l-8-13.8a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  bolt: <path d="M13 2 5 13h6l-2 9 8-12h-6l2-8Z" />,
  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-5" />
      <path d="M12 15V7" />
      <path d="M16 15v-3" />
    </>
  ),
  city: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V8l5-3v16" />
      <path d="M14 21V4h5v17" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
      <path d="M17 8h.01" />
      <path d="M17 12h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  droplet: <path d="M12 2.5S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5Z" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  filter: (
    <>
      <path d="M3 5h18" />
      <path d="M6 12h12" />
      <path d="M10 19h4" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </>
  ),
  radar: (
    <>
      <path d="M12 12 20 4" />
      <path d="M20.4 15a9 9 0 1 1-4-11.4" />
      <path d="M16 12a4 4 0 1 1-4-4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v6h-6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M6 16V8a3 3 0 0 1 3-3h6" />
      <path d="m13 7 2-2-2-2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9Z" />
      <path d="M17 9.5a4 4 0 0 1 0 5" />
      <path d="M20 7a8 8 0 0 1 0 10" />
    </>
  ),
  table: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16" />
      <path d="M10 5v14" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h16a3 3 0 1 1-3 3" />
      <path d="M3 16h8" />
    </>
  )
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}

function compactNumber(value) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatValue(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "--";
  return Intl.NumberFormat("en", { maximumFractionDigits: value > 1000 ? 0 : 1 }).format(value);
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateTimeLabel(date) {
  if (!date) return "Waiting for telemetry";
  return new Date(date).toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function ratioStatus(ratio) {
  if (!Number.isFinite(ratio)) return { label: "No data", tone: "idle" };
  if (ratio >= 1.25) return { label: "Critical", tone: "critical" };
  if (ratio >= 1) return { label: "Watch", tone: "watch" };
  if (ratio >= 0.82) return { label: "Elevated", tone: "elevated" };
  return { label: "Clear", tone: "clear" };
}

function healthTone(score) {
  if (score >= 84) return "clear";
  if (score >= 70) return "elevated";
  if (score >= 56) return "watch";
  return "critical";
}

function metricDelta(current, previous) {
  if (!current || !previous) return { label: "baseline", direction: "flat" };
  const change = current.value - previous.value;
  if (Math.abs(change) < 0.5) return { label: "steady", direction: "flat" };
  return {
    label: `${change > 0 ? "+" : ""}${formatValue(change)}`,
    direction: change > 0 ? "up" : "down"
  };
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
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setLoadStatus("loading");
      setLoadError("");

      try {
        const [zoneData, readingData, alertData] = await Promise.all([
          getJson("/api/zones"),
          getJson(`/api/readings?range=${range}&limit=320`),
          getJson(`/api/alerts?range=${range}&limit=120`)
        ]);

        if (!active) return;
        setZones(zoneData);
        setReadings(readingData.reverse());
        setAlerts(alertData);
        setLoadStatus("ready");
      } catch (error) {
        if (!active) return;
        console.error(error);
        setLoadError("Telemetry services are not responding. Check the API process and retry.");
        setLoadStatus("error");
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  useEffect(() => {
    const handleReading = (reading) => {
      setReadings((current) => [...current.slice(-399), reading]);
    };
    const handleAlert = (alert) => {
      setAlerts((current) => [alert, ...current.slice(0, 119)]);
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

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const activeZone = selectedZone === "all" ? null : zoneById.get(selectedZone);
  const zoneLabel = activeZone?.name || "All districts";

  const scopedReadings = useMemo(
    () => readings.filter((reading) => selectedZone === "all" || reading.zoneId === selectedZone),
    [readings, selectedZone]
  );

  const latestByMetric = useMemo(() => {
    const latest = {};
    scopedReadings.forEach((reading) => {
      latest[reading.metric] = reading;
    });
    return latest;
  }, [scopedReadings]);

  const previousByMetric = useMemo(() => {
    const grouped = {};
    scopedReadings.forEach((reading) => {
      grouped[reading.metric] = grouped[reading.metric] ? [...grouped[reading.metric], reading].slice(-2) : [reading];
    });
    return Object.fromEntries(Object.entries(grouped).map(([metric, values]) => [metric, values.at(-2)]));
  }, [scopedReadings]);

  const latestByZoneMetric = useMemo(() => {
    const latest = new Map();
    readings.forEach((reading) => {
      latest.set(`${reading.zoneId}:${reading.metric}`, reading);
    });
    return latest;
  }, [readings]);

  const thresholdsByMetric = useMemo(() => {
    if (activeZone) return activeZone.thresholds || {};

    return Object.keys(metricLabels).reduce((thresholds, metric) => {
      const values = zones.map((zone) => zone.thresholds?.[metric]).filter(Boolean);
      thresholds[metric] = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
      return thresholds;
    }, {});
  }, [activeZone, zones]);

  const selectedMetricReadings = useMemo(
    () => scopedReadings.filter((reading) => reading.metric === selectedMetric).slice(-110),
    [scopedReadings, selectedMetric]
  );

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => selectedZone === "all" || alert.zoneId === selectedZone),
    [alerts, selectedZone]
  );

  const zoneSnapshots = useMemo(() => {
    return zones.map((zone) => {
      const zoneAlerts = alerts.filter((alert) => alert.zoneId === zone.id);
      const critical = zoneAlerts.filter((alert) => alert.severity === "critical").length;
      const watch = zoneAlerts.length - critical;
      const overloaded = Object.keys(metricLabels).filter((metric) => {
        const reading = latestByZoneMetric.get(`${zone.id}:${metric}`);
        const threshold = zone.thresholds?.[metric];
        return reading && threshold && reading.value >= threshold;
      }).length;
      const score = Math.max(32, 100 - critical * 13 - watch * 7 - overloaded * 9);

      return {
        ...zone,
        critical,
        watch,
        alerts: zoneAlerts.length,
        overloaded,
        score,
        tone: healthTone(score)
      };
    });
  }, [alerts, latestByZoneMetric, zones]);

  const metricSnapshots = useMemo(() => {
    return Object.entries(metricLabels).map(([metric, label]) => {
      const latest = latestByMetric[metric];
      const previous = previousByMetric[metric];
      const threshold = thresholdsByMetric[metric];
      const ratio = latest?.value / threshold;
      const status = ratioStatus(ratio);
      const delta = metricDelta(latest, previous);

      return {
        metric,
        label,
        latest,
        threshold,
        ratio,
        status,
        delta,
        unit: metricUnits[metric],
        color: metricColors[metric],
        meta: metricMeta[metric],
        percent: Number.isFinite(ratio) ? Math.min(100, Math.round(ratio * 100)) : 0
      };
    });
  }, [latestByMetric, previousByMetric, thresholdsByMetric]);

  const selectedSnapshot = metricSnapshots.find((snapshot) => snapshot.metric === selectedMetric) || metricSnapshots[0];
  const averageHealth = zoneSnapshots.length
    ? Math.round(zoneSnapshots.reduce((sum, zone) => sum + zone.score, 0) / zoneSnapshots.length)
    : 0;
  const criticalCount = activeAlerts.filter((alert) => alert.severity === "critical").length;
  const monitoredPopulation = activeZone
    ? activeZone.population
    : zones.reduce((sum, zone) => sum + (zone.population || 0), 0);
  const latestReadingAt = scopedReadings.at(-1)?.recordedAt;
  const totalSensors = new Set(scopedReadings.map((reading) => reading.sensorId)).size || zones.length * 5;
  const riskZones = zoneSnapshots.filter((zone) => zone.tone === "critical" || zone.tone === "watch").length;
  const sortedZones = [...zoneSnapshots].sort((a, b) => a.score - b.score);

  const lineData = {
    labels: selectedMetricReadings.map((reading) => timeLabel(reading.recordedAt)),
    datasets: [
      {
        label: metricLabels[selectedMetric],
        data: selectedMetricReadings.map((reading) => reading.value),
        borderColor: metricColors[selectedMetric],
        backgroundColor: `${metricColors[selectedMetric]}24`,
        pointRadius: 0,
        borderWidth: 3,
        tension: 0.38,
        fill: true
      },
      ...(selectedSnapshot?.threshold
        ? [
            {
              label: "Threshold",
              data: selectedMetricReadings.map(() => selectedSnapshot.threshold),
              borderColor: "#8c8173",
              borderDash: [8, 8],
              pointRadius: 0,
              borderWidth: 2,
              fill: false
            }
          ]
        : [])
    ]
  };

  const healthData = {
    labels: zoneSnapshots.map((zone) => zone.name.replace(" District", "")),
    datasets: [
      {
        label: "Health",
        data: zoneSnapshots.map((zone) => zone.score),
        backgroundColor: zoneSnapshots.map((zone) => zone.color),
        borderRadius: 4,
        borderSkipped: false
      }
    ]
  };

  const reportQuery = `zoneId=${selectedZone}&range=${range}`;
  const gaugeValue = selectedSnapshot?.percent || 0;

  return (
    <div className="city-desk">
      <a className="skip-link" href="#content">
        Skip to dashboard
      </a>

      <header className="command-header">
        <a className="brand" href="#content" aria-label="Smart City dashboard home">
          <span className="brand-symbol" aria-hidden="true">
            <Icon name="city" size={24} />
          </span>
          <span>
            <strong>UrbanSignal</strong>
            <small>IoT Operations</small>
          </span>
        </a>

        <nav className="command-nav" aria-label="Dashboard sections">
          <a href="#signals">Signals</a>
          <a href="#districts">Districts</a>
          <a href="#matrix">Matrix</a>
          <a href="#events">Events</a>
        </nav>

        <div className="command-actions">
          <a className="action-link" href={`${API_BASE}/api/reports/compliance?${reportQuery}`} target="_blank">
            <Icon name="file" /> JSON
          </a>
          <a className="action-link primary" href={`${API_BASE}/api/reports/compliance.csv?${reportQuery}`}>
            <Icon name="download" /> CSV
          </a>
        </div>
      </header>

      <main className="command-center" id="content">
        <section className="mission-grid" aria-label="Mission overview">
          <article className="mission-control">
            <div className="section-kicker">
              <span>Command Scope</span>
              <strong className={`telemetry-status ${connected ? "online" : ""}`}>
                <i aria-hidden="true" />
                {connected ? "Live feed" : "Stored data"} / {dateTimeLabel(latestReadingAt)}
              </strong>
            </div>

            <div className="mission-title">
              <p>Smart City IoT Dashboard</p>
              <h1>{zoneLabel} telemetry, risk, and compliance in one operating view.</h1>
            </div>

            <div className="scope-controls" aria-label="Dashboard filters">
              <label>
                District
                <select value={selectedZone} onChange={(event) => setSelectedZone(event.target.value)}>
                  <option value="all">All districts</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Primary signal
                <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)}>
                  {metricSnapshots.map((snapshot) => (
                    <option key={snapshot.metric} value={snapshot.metric}>
                      {snapshot.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="range-tabs" role="group" aria-label="History range">
                {Object.entries(rangeShortLabels).map(([value, label]) => (
                  <button
                    aria-pressed={range === value}
                    className={range === value ? "selected" : ""}
                    key={value}
                    onClick={() => setRange(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button className="refresh-button" onClick={() => setRefreshKey((current) => current + 1)} type="button">
                <Icon name="refresh" /> Refresh
              </button>
            </div>

            {loadError && (
              <div className="error-strip" role="alert">
                <Icon name="alert" />
                <span>{loadError}</span>
                <button onClick={() => setRefreshKey((current) => current + 1)} type="button">
                  Retry
                </button>
              </div>
            )}

            <div className="readout-row">
              <div
                className={`signal-gauge tone-${selectedSnapshot?.meta.tone || "cyan"}`}
                style={{ "--gauge-value": `${gaugeValue}%` }}
                aria-label={`${selectedSnapshot?.label} is at ${gaugeValue}% of threshold`}
              >
                <span>{gaugeValue}</span>
                <small>% of limit</small>
              </div>

              <div className="hero-readout">
                <span className={`state-badge ${selectedSnapshot?.status.tone}`}>{selectedSnapshot?.status.label}</span>
                <h2>{selectedSnapshot?.label}</h2>
                <p>
                  <strong>{formatValue(selectedSnapshot?.latest?.value)}</strong>
                  <span>{selectedSnapshot?.unit}</span>
                </p>
                <dl>
                  <div>
                    <dt>Limit</dt>
                    <dd>{formatValue(selectedSnapshot?.threshold)}</dd>
                  </div>
                  <div>
                    <dt>Delta</dt>
                    <dd className={selectedSnapshot?.delta.direction}>{selectedSnapshot?.delta.label}</dd>
                  </div>
                  <div>
                    <dt>Samples</dt>
                    <dd>{selectedMetricReadings.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>

          <article className="operations-summary" aria-label="Operating summary">
            <div className="summary-top">
              <span className="summary-icon" aria-hidden="true">
                <Icon name="radar" size={22} />
              </span>
              <div>
                <p>Operations posture</p>
                <strong>{averageHealth || "--"}%</strong>
              </div>
            </div>

            <div className="summary-list">
              <div>
                <span>Active alerts</span>
                <strong>{activeAlerts.length}</strong>
                <small>{criticalCount} critical</small>
              </div>
              <div>
                <span>Sensors</span>
                <strong>{totalSensors}</strong>
                <small>{connected ? "live feed" : "stored data"}</small>
              </div>
              <div>
                <span>Population</span>
                <strong>{compactNumber(monitoredPopulation)}</strong>
                <small>{zoneLabel}</small>
              </div>
              <div>
                <span>Risk zones</span>
                <strong>{riskZones}</strong>
                <small>{rangeLabels[range]}</small>
              </div>
            </div>
          </article>
        </section>

        <section className="signal-strip" id="signals" aria-label="Signal selector">
          {metricSnapshots.map((snapshot) => (
            <button
              aria-pressed={selectedMetric === snapshot.metric}
              className={`signal-chip tone-${snapshot.meta.tone}`}
              key={snapshot.metric}
              onClick={() => setSelectedMetric(snapshot.metric)}
              type="button"
            >
              <span className="chip-icon" aria-hidden="true">
                <Icon name={snapshot.meta.icon} />
              </span>
              <span>
                <small>{snapshot.meta.label}</small>
                <strong>{snapshot.label}</strong>
              </span>
              <em className={snapshot.status.tone}>{snapshot.status.label}</em>
              <b>{formatValue(snapshot.latest?.value)}</b>
            </button>
          ))}
        </section>

        <section className="analysis-grid">
          <article className="surface trend-surface">
            <div className="surface-header">
              <div>
                <span className="section-label">
                  <Icon name="pulse" /> Signal analysis
                </span>
                <h2>{selectedSnapshot?.label} trend</h2>
              </div>
              <div className="chart-legend" aria-label="Chart legend">
                <span style={{ "--legend-color": selectedSnapshot?.color }} />
                <b>{selectedSnapshot?.label}</b>
                <span className="dash" />
                <b>Threshold</b>
              </div>
            </div>

            <div className="trend-layout">
              <div
                aria-label={`${selectedSnapshot?.label} line chart for ${zoneLabel}`}
                className="chart-stage"
                role="img"
              >
                {loadStatus === "loading" && <div className="loading-panel">Loading telemetry...</div>}
                {loadStatus !== "loading" && selectedMetricReadings.length === 0 && (
                  <div className="loading-panel">No readings available for this scope.</div>
                )}
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { mode: "index", intersect: false }
                    },
                    interaction: { mode: "nearest", intersect: false },
                    scales: {
                      x: {
                        ticks: { color: "#64748b", maxTicksLimit: 8, font: { size: 11 } },
                        grid: { display: false }
                      },
                      y: {
                        ticks: { color: "#64748b", font: { size: 11 } },
                        grid: { color: "rgba(100, 116, 139, 0.16)" }
                      }
                    }
                  }}
                />
              </div>

              <div className="reading-table" aria-label="Latest signal details">
                <div>
                  <span>Signal</span>
                  <strong>{selectedSnapshot?.label}</strong>
                </div>
                <div>
                  <span>Latest</span>
                  <strong>{formatValue(selectedSnapshot?.latest?.value)} {selectedSnapshot?.unit}</strong>
                </div>
                <div>
                  <span>Threshold</span>
                  <strong>{formatValue(selectedSnapshot?.threshold)} {selectedSnapshot?.unit}</strong>
                </div>
                <div>
                  <span>Last sample</span>
                  <strong>{dateTimeLabel(selectedSnapshot?.latest?.recordedAt)}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="surface districts-surface" id="districts">
            <div className="surface-header">
              <div>
                <span className="section-label">
                  <Icon name="crosshair" /> District priority
                </span>
                <h2>Health ranking</h2>
              </div>
            </div>

            <div className="district-layout">
              <div className="city-map">
                <svg aria-hidden="true" className="city-lines" viewBox="0 0 600 360">
                  <path d="M40 260 C150 180 245 205 340 110 S515 90 560 42" />
                  <path d="M80 70 C120 165 206 198 288 230 S435 285 540 234" />
                  <path d="M292 24 L316 330" />
                  <path d="M40 176 L560 176" />
                  <rect x="62" y="44" width="92" height="64" rx="8" />
                  <rect x="414" y="54" width="104" height="76" rx="8" />
                  <rect x="86" y="238" width="126" height="64" rx="8" />
                  <rect x="364" y="222" width="120" height="76" rx="8" />
                </svg>
                {zoneSnapshots.map((zone) => (
                  <button
                    aria-label={`${zone.name}: ${Math.round(zone.score)}% health, ${zone.alerts} alerts`}
                    aria-pressed={selectedZone === zone.id}
                    className={`map-node tone-${zone.tone}`}
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%`, "--zone-color": zone.color }}
                    type="button"
                  >
                    <span>{zone.alerts}</span>
                  </button>
                ))}
              </div>

              <div className="district-rank">
                {sortedZones.map((zone) => (
                  <button
                    aria-pressed={selectedZone === zone.id}
                    className={`district-row tone-${zone.tone}`}
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    type="button"
                  >
                    <span className="district-dot" style={{ background: zone.color }} aria-hidden="true" />
                    <span>
                      <strong>{zone.name}</strong>
                      <small>{zone.type} / {compactNumber(zone.population)} people</small>
                    </span>
                    <em>{Math.round(zone.score)}%</em>
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="surface health-surface">
            <div className="surface-header">
              <div>
                <span className="section-label">
                  <Icon name="chart" /> Comparison
                </span>
                <h2>District health</h2>
              </div>
            </div>

            <div className="mini-chart" aria-label="Horizontal bar chart of district health" role="img">
              <Bar
                data={healthData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { color: "#64748b", font: { size: 11 } },
                      grid: { color: "rgba(100, 116, 139, 0.16)" }
                    },
                    y: {
                      ticks: { color: "#334155", font: { size: 11, weight: 700 } },
                      grid: { display: false }
                    }
                  }
                }}
              />
            </div>
          </article>

          <article className="surface matrix-surface" id="matrix">
            <div className="surface-header">
              <div>
                <span className="section-label">
                  <Icon name="table" /> Data matrix
                </span>
                <h2>Threshold heat map</h2>
              </div>
            </div>

            <div className="matrix-table" role="region" aria-label="Threshold heat map table" tabIndex="0">
              <table>
                <thead>
                  <tr>
                    <th>District</th>
                    {Object.keys(metricLabels).map((metric) => (
                      <th key={metric}>{metricMeta[metric].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zoneSnapshots.map((zone) => (
                    <tr key={zone.id}>
                      <th scope="row">{zone.name}</th>
                      {Object.keys(metricLabels).map((metric) => {
                        const reading = latestByZoneMetric.get(`${zone.id}:${metric}`);
                        const threshold = zone.thresholds?.[metric];
                        const status = ratioStatus(reading?.value / threshold);
                        return (
                          <td className={`heat-cell ${status.tone}`} key={metric}>
                            <strong>{formatValue(reading?.value)}</strong>
                            <span>{status.label}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="surface events-surface" id="events">
            <div className="surface-header">
              <div>
                <span className="section-label">
                  <Icon name="alert" /> Events
                </span>
                <h2>Response timeline</h2>
              </div>
              <span className="event-count">{activeAlerts.length} events</span>
            </div>

            <div className="event-list">
              {loadStatus === "loading" && <div className="loading-panel">Loading alert feed...</div>}
              {loadStatus !== "loading" && activeAlerts.length === 0 && (
                <p className="empty-state">No threshold breaches in the current scope.</p>
              )}
              {activeAlerts.slice(0, 8).map((alert, index) => {
                const zone = zoneById.get(alert.zoneId);
                return (
                  <article className={`event-row ${alert.severity}`} key={`${alert.recordedAt}-${index}`}>
                    <span aria-hidden="true" />
                    <div>
                      <strong>{alert.severity}</strong>
                      <p>{alert.message}</p>
                      <small>{zone?.name || alert.zoneId}</small>
                    </div>
                    <time>{timeLabel(alert.recordedAt)}</time>
                  </article>
                );
              })}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
