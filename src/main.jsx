import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
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
import { Line } from "react-chartjs-2";
import { io } from "socket.io-client";
import "./styles.css";

ChartJS.register(
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
  trafficFlow: "Traffic",
  pm25: "Air Quality",
  electricityKw: "Power",
  waterLitres: "Water",
  noiseDb: "Noise"
};

const metricUnits = {
  trafficFlow: "veh/hr",
  pm25: "µg/m³",
  electricityKw: "kW",
  waterLitres: "L/hr",
  noiseDb: "dB"
};

const metricColors = {
  trafficFlow: "#0f766e",
  pm25: "#b45309",
  electricityKw: "#a16207",
  waterLitres: "#1d4ed8",
  noiseDb: "#7c3aed"
};

const metricIcons = {
  trafficFlow: "route",
  pm25: "wind",
  electricityKw: "bolt",
  waterLitres: "droplet",
  noiseDb: "sound"
};

const rangeOptions = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" }
];

const rangeFullLabels = { "1h": "Last hour", "24h": "Last 24 hours", "7d": "Last 7 days" };

const iconPaths = {
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="m10.3 3.9-8 13.8A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.3l-8-13.8a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  bolt: <path d="M13 2 5 13h6l-2 9 8-12h-6l2-8Z" />,
  check: <path d="m5 12 5 5L20 7" />,
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  droplet: <path d="M12 2.5S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5Z" />,
  pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
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
  sound: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9Z" />
      <path d="M17 9.5a4 4 0 0 1 0 5" />
      <path d="M20 7a8 8 0 0 1 0 10" />
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

function Icon({ name, size = 16 }) {
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
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return Intl.NumberFormat("en", { maximumFractionDigits: value > 1000 ? 0 : 1 }).format(value);
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(date) {
  if (!date) return "—";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function ratioTone(ratio) {
  if (!Number.isFinite(ratio)) return "idle";
  if (ratio >= 1.2) return "critical";
  if (ratio >= 1) return "warning";
  if (ratio >= 0.85) return "elevated";
  return "ok";
}

function ratioLabel(tone) {
  return { critical: "Critical", warning: "Watch", elevated: "Elevated", ok: "Nominal", idle: "—" }[tone];
}

function healthTone(score) {
  if (score >= 84) return "ok";
  if (score >= 70) return "elevated";
  if (score >= 56) return "warning";
  return "critical";
}

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function Sparkline({ values, color, height = 24 }) {
  if (!values || values.length < 2) {
    return <div className="sparkline empty" style={{ height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / span) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden="true"
      className="sparkline"
      preserveAspectRatio="none"
      style={{ height }}
      viewBox="0 0 100 100"
    >
      <polyline
        fill="none"
        points={points}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
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
  const [refreshing, setRefreshing] = useState(false);
  const [latestAlert, setLatestAlert] = useState(null);

  useEffect(() => {
    let active = true;
    setRefreshing(true);

    async function loadInitialData() {
      setLoadStatus((prev) => (prev === "ready" ? "ready" : "loading"));
      setLoadError("");

      try {
        const [zoneData, readingData, alertData] = await Promise.all([
          getJson("/api/zones"),
          getJson(`/api/readings?range=${range}&limit=4000`),
          getJson(`/api/alerts?range=${range}&limit=200`)
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
      } finally {
        if (active) setRefreshing(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  useEffect(() => {
    const handleReading = (reading) => {
      setReadings((current) => [...current.slice(-4999), reading]);
    };
    const handleAlert = (alert) => {
      setAlerts((current) => [alert, ...current.slice(0, 199)]);
      setLatestAlert(alert);
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

  useEffect(() => {
    if (!latestAlert) return undefined;
    const timer = window.setTimeout(() => setLatestAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [latestAlert]);

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const activeZone = selectedZone === "all" ? null : zoneById.get(selectedZone);
  const zoneLabel = activeZone?.name || "All cities";

  const scopedReadings = useMemo(
    () => readings.filter((r) => selectedZone === "all" || r.zoneId === selectedZone),
    [readings, selectedZone]
  );

  const latestByMetric = useMemo(() => {
    const out = {};
    scopedReadings.forEach((r) => {
      out[r.metric] = r;
    });
    return out;
  }, [scopedReadings]);

  const sparkByMetric = useMemo(() => {
    const out = {};
    Object.keys(metricLabels).forEach((m) => {
      out[m] = scopedReadings.filter((r) => r.metric === m).slice(-40).map((r) => r.value);
    });
    return out;
  }, [scopedReadings]);

  const latestByZoneMetric = useMemo(() => {
    const latest = new Map();
    readings.forEach((r) => {
      latest.set(`${r.zoneId}:${r.metric}`, r);
    });
    return latest;
  }, [readings]);

  const thresholdsByMetric = useMemo(() => {
    if (activeZone) return activeZone.thresholds || {};
    return Object.keys(metricLabels).reduce((acc, m) => {
      const values = zones.map((z) => z.thresholds?.[m]).filter(Boolean);
      acc[m] = values.reduce((s, v) => s + v, 0) / (values.length || 1);
      return acc;
    }, {});
  }, [activeZone, zones]);

  const selectedMetricReadings = useMemo(
    () => scopedReadings.filter((r) => r.metric === selectedMetric).slice(-110),
    [scopedReadings, selectedMetric]
  );

  const activeAlerts = useMemo(
    () => alerts.filter((a) => selectedZone === "all" || a.zoneId === selectedZone),
    [alerts, selectedZone]
  );

  const zoneSnapshots = useMemo(() => {
    return zones.map((zone) => {
      const zoneAlerts = alerts.filter((a) => a.zoneId === zone.id);
      const critical = zoneAlerts.filter((a) => a.severity === "critical").length;
      const watch = zoneAlerts.length - critical;

      // Score driven by actual current threshold ratios so each city differs meaningfully.
      // ratio 0.5 → ~81pts  |  ratio 0.8 → ~70pts  |  ratio 1.0 → ~62pts  |  ratio 1.2 → ~54pts
      const metricScores = Object.keys(metricLabels).map((m) => {
        const r = latestByZoneMetric.get(`${zone.id}:${m}`);
        const t = zone.thresholds?.[m];
        if (!r || !t) return 72; // neutral when no data yet
        return Math.max(10, Math.round(100 - (r.value / t) * 38));
      });
      const base = Math.round(metricScores.reduce((s, v) => s + v, 0) / metricScores.length);
      const alertPenalty = Math.min(22, critical * 4 + Math.min(8, watch));
      const overloaded = Object.keys(metricLabels).filter((m) => {
        const r = latestByZoneMetric.get(`${zone.id}:${m}`);
        const t = zone.thresholds?.[m];
        return r && t && r.value >= t;
      }).length;
      const score = Math.max(15, base - alertPenalty);
      return { ...zone, critical, watch, alerts: zoneAlerts.length, overloaded, score, tone: healthTone(score) };
    });
  }, [alerts, latestByZoneMetric, zones]);

  const metricSnapshots = useMemo(() => {
    return Object.entries(metricLabels).map(([metric, label]) => {
      const latest = latestByMetric[metric];
      const threshold = thresholdsByMetric[metric];
      const ratio = latest?.value / threshold;
      const tone = ratioTone(ratio);
      return {
        metric,
        label,
        latest,
        threshold,
        ratio,
        tone,
        unit: metricUnits[metric],
        color: metricColors[metric],
        icon: metricIcons[metric],
        spark: sparkByMetric[metric] || [],
        percent: Number.isFinite(ratio) ? Math.round(ratio * 100) : 0
      };
    });
  }, [latestByMetric, thresholdsByMetric, sparkByMetric]);

  const selectedSnapshot = metricSnapshots.find((s) => s.metric === selectedMetric) || metricSnapshots[0];
  const selectedThresholdValue = selectedSnapshot?.threshold;
  const breachCount = selectedMetricReadings.filter((r) => {
    const t = activeZone?.thresholds?.[selectedMetric] || zoneById.get(r.zoneId)?.thresholds?.[selectedMetric] || selectedThresholdValue;
    return t && r.value > t;
  }).length;

  const averageHealth = zoneSnapshots.length
    ? Math.round(zoneSnapshots.reduce((s, z) => s + z.score, 0) / zoneSnapshots.length)
    : 0;
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const monitoredPopulation = activeZone
    ? activeZone.population
    : zones.reduce((s, z) => s + (z.population || 0), 0);
  const latestReadingAt = scopedReadings.at(-1)?.recordedAt;
  const totalSensors = new Set(scopedReadings.map((r) => r.sensorId)).size || zones.length * 5;
  const sortedZones = [...zoneSnapshots].sort((a, b) => a.score - b.score);

  const activeColor = metricColors[selectedMetric];

  const lineData = {
    labels: selectedMetricReadings.map((r) => timeLabel(r.recordedAt)),
    datasets: [
      {
        label: metricLabels[selectedMetric],
        data: selectedMetricReadings.map((r) => r.value),
        borderColor: activeColor,
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return hexToRgba(activeColor, 0.12);
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, hexToRgba(activeColor, 0.22));
          gradient.addColorStop(0.65, hexToRgba(activeColor, 0.06));
          gradient.addColorStop(1, hexToRgba(activeColor, 0.0));
          return gradient;
        },
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
        tension: 0.4,
        fill: "start"
      },
      ...(selectedThresholdValue
        ? [
            {
              label: "Threshold",
              data: selectedMetricReadings.map(() => selectedThresholdValue),
              borderColor: "#64748b",
              borderDash: [6, 4],
              pointRadius: 0,
              borderWidth: 2,
              fill: false
            }
          ]
        : [])
    ]
  };

  const reportQuery = `zoneId=${selectedZone}&range=${range}`;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 6, bottom: 0, left: 0, right: 4 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        borderWidth: 0,
        padding: 12,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10
      }
    },
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        ticks: {
          color: "#94a3b8",
          maxTicksLimit: 7,
          font: { size: 11, family: "Inter" },
          maxRotation: 0
        },
        grid: { display: false },
        border: { display: false }
      },
      y: {
        beginAtZero: false,
        grace: "8%",
        ticks: {
          color: "#94a3b8",
          maxTicksLimit: 5,
          font: { size: 11, family: "JetBrains Mono" },
          padding: 8
        },
        grid: {
          color: "rgba(15, 23, 42, 0.07)",
          drawTicks: false
        },
        border: { display: false }
      }
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to dashboard</a>

      {latestAlert && (
        <div className={`toast toast-${latestAlert.severity}`} role="status" aria-live="polite">
          <span className="toast-glyph"><Icon name="alert" /></span>
          <div className="toast-body">
            <div className="toast-title">
              {latestAlert.severity === "critical" ? "Critical breach" : "Threshold watch"}
            </div>
            <div className="toast-message">{latestAlert.message}</div>
            <div className="toast-meta">
              <span className="mono">{formatValue(latestAlert.value)}</span>
              <span className="dot" />
              <span>limit {formatValue(latestAlert.threshold)}</span>
            </div>
          </div>
          <button
            className="icon-btn ghost"
            aria-label="Dismiss notification"
            onClick={() => setLatestAlert(null)}
            type="button"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <header className="topbar">
        <div className="brand-text">
          <div className="brand-name">UrbanSignal</div>
          <div className="brand-tag">IoT Operations</div>
        </div>

        <div className="topbar-status">
          <span className={`live-indicator ${connected ? "online" : "offline"}`}>
            <span className="pulse" />
            {connected ? "Live" : "Stored"}
          </span>
          <span className="status-meta">{rangeFullLabels[range]}</span>
          {latestReadingAt && (
            <span className="status-meta mono">{timeAgo(latestReadingAt)}</span>
          )}
        </div>

        <div className="topbar-actions">
          <div className="range-group" role="group" aria-label="Time range">
            {rangeOptions.map((r) => (
              <button
                key={r.value}
                aria-pressed={range === r.value}
                className={range === r.value ? "active" : ""}
                onClick={() => setRange(r.value)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            className={`icon-btn ${refreshing ? "spinning" : ""}`}
            aria-label="Refresh telemetry"
            onClick={() => setRefreshKey((k) => k + 1)}
            type="button"
          >
            <Icon name="refresh" />
          </button>

          <a
            className="btn btn-primary"
            href={`${API_BASE}/api/reports/compliance.csv?${reportQuery}`}
          >
            <Icon name="download" /> Export CSV
          </a>
        </div>
      </header>

      <main className="main" id="main">
        <section className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">India · {zones.length || 8} metro cities</div>
            <h1 className="hero-title">{zoneLabel}</h1>
            {loadError && (
              <div className="banner-error" role="alert">
                <Icon name="alert" />
                <span>{loadError}</span>
                <button onClick={() => setRefreshKey((k) => k + 1)} type="button">Retry</button>
              </div>
            )}
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-label">Network health</div>
              <div className="stat-value mono">{averageHealth || "—"}<span className="stat-unit">%</span></div>
              <div className={`stat-foot tone-${healthTone(averageHealth)}`}>
                {ratioLabel(healthTone(averageHealth)) || "—"}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Active alerts</div>
              <div className="stat-value mono">{activeAlerts.length}</div>
              <div className={`stat-foot ${criticalCount > 0 ? "tone-critical" : ""}`}>{criticalCount} critical</div>
            </div>
            <div className="stat">
              <div className="stat-label">Sensors</div>
              <div className="stat-value mono">{totalSensors}</div>
              <div className="stat-foot">{connected ? "live feed" : "stored"}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Population</div>
              <div className="stat-value mono">{compactNumber(monitoredPopulation)}</div>
              <div className="stat-foot">{zoneLabel}</div>
            </div>
          </div>
        </section>

        <section className="kpi-strip" aria-label="Metric overview">
          {metricSnapshots.map((s) => (
            <button
              key={s.metric}
              type="button"
              className={`kpi-tile tone-${s.tone} ${selectedMetric === s.metric ? "active" : ""}`}
              aria-pressed={selectedMetric === s.metric}
              onClick={() => setSelectedMetric(s.metric)}
              style={{ "--tile-accent": s.color }}
            >
              <div className="kpi-head">
                <span className="kpi-icon" aria-hidden="true"><Icon name={s.icon} /></span>
                <span className="kpi-label">{s.label}</span>
                <span className={`pill pill-${s.tone}`}>{ratioLabel(s.tone)}</span>
              </div>
              <div className="kpi-value">
                <span className="mono">{formatValue(s.latest?.value)}</span>
                <span className="kpi-unit">{s.unit}</span>
              </div>
              <div className="kpi-foot">
                <span className="kpi-threshold mono">{Number.isFinite(s.percent) ? s.percent : 0}%</span>
                <span className="kpi-threshold-label">of limit</span>
                <Sparkline values={s.spark} color={s.color} />
              </div>
            </button>
          ))}
        </section>

        <section className="bento">
          <article className="card card-controls">
            <div className="card-eyebrow"><Icon name="route" /> View</div>
            <div className="controls-body">
              <div className="select-wrap">
                <label htmlFor="zone-select">City</label>
                <select
                  id="zone-select"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                >
                  <option value="all">All cities</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}{z.state ? ` — ${z.state}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="select-wrap">
                <label htmlFor="metric-select">Signal</label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  {Object.entries(metricLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {selectedSnapshot && (
                <div className="ctrl-snapshot">
                  <div className="ctrl-snap-label">{selectedSnapshot.label}</div>
                  <div className="ctrl-snap-value mono" style={{ color: selectedSnapshot.color }}>
                    {formatValue(selectedSnapshot.latest?.value)}
                    <span className="ctrl-snap-unit">{selectedSnapshot.unit}</span>
                  </div>
                  <div className="ctrl-snap-sub">
                    <span className={`pill pill-${selectedSnapshot.tone}`}>{ratioLabel(selectedSnapshot.tone)}</span>
                    <span className="ctrl-snap-pct mono">{selectedSnapshot.percent}% of limit</span>
                  </div>
                  <Sparkline values={selectedSnapshot.spark} color={selectedSnapshot.color} height={36} />
                </div>
              )}
            </div>
          </article>

          <article className="card card-trend">
            <header className="card-header">
              <div>
                <div className="card-eyebrow"><Icon name="pulse" /> Trend</div>
                <h2 className="card-title">{selectedSnapshot?.label} · {zoneLabel}</h2>
              </div>
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-swatch" style={{ background: selectedSnapshot?.color }} />
                  {selectedSnapshot?.label}
                </span>
                <span className="legend-item muted">
                  <span className="legend-swatch dashed" />
                  Threshold
                </span>
                {breachCount > 0 && <span className="legend-breach">{breachCount} breaches</span>}
              </div>
            </header>
            <div className="chart-frame">
              {loadStatus === "loading" && <div className="state-overlay"><div className="skeleton-bar" /></div>}
              {loadStatus !== "loading" && selectedMetricReadings.length === 0 && (
                <div className="state-overlay empty">No readings in this scope.</div>
              )}
              <Line data={lineData} options={chartOptions} />
            </div>
          </article>

          <article className="card card-rank">
            <header className="card-header">
              <div>
                <div className="card-eyebrow"><Icon name="route" /> Ranking</div>
                <h2 className="card-title">City stress score</h2>
              </div>
              <span className="card-meta">Lowest first</span>
            </header>
            <ul className="rank-list">
              {sortedZones.map((zone, index) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    className={`rank-row tone-${zone.tone} ${selectedZone === zone.id ? "selected" : ""}`}
                    aria-pressed={selectedZone === zone.id}
                    onClick={() => setSelectedZone(zone.id === selectedZone ? "all" : zone.id)}
                  >
                    <span className="rank-index mono">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rank-body">
                      <span className="rank-name">{zone.name}</span>
                      <span className="rank-sub">
                        {zone.state || zone.type} · {compactNumber(zone.population)} ppl · {zone.alerts} alerts
                      </span>
                    </span>
                    <span className="rank-bar" aria-hidden="true">
                      <span className="rank-bar-fill" style={{ width: `${zone.score}%` }} />
                    </span>
                    <span className="rank-score mono">{Math.round(zone.score)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="card card-alerts">
            <header className="card-header">
              <div>
                <div className="card-eyebrow"><Icon name="alert" /> Events</div>
                <h2 className="card-title">Live alert stream</h2>
              </div>
              <span className="card-meta mono">{activeAlerts.length}</span>
            </header>
            <ul className="alert-list">
              {loadStatus === "loading" && <li className="empty">Loading…</li>}
              {loadStatus !== "loading" && activeAlerts.length === 0 && (
                <li className="empty"><Icon name="check" /> No threshold breaches in scope.</li>
              )}
              {activeAlerts.map((alert, i) => {
                const zone = zoneById.get(alert.zoneId);
                return (
                  <li
                    key={`${alert.recordedAt}-${i}`}
                    className={`alert-item alert-${alert.severity}`}
                  >
                    <span className="alert-bar" aria-hidden="true" />
                    <div className="alert-main">
                      <div className="alert-top">
                        <span className={`pill pill-${alert.severity === "critical" ? "critical" : "warning"}`}>
                          {alert.severity}
                        </span>
                        <span className="alert-zone">{zone?.name || alert.zoneId}</span>
                        <time className="alert-time mono">{timeAgo(alert.recordedAt)}</time>
                      </div>
                      <div className="alert-msg">{alert.message}</div>
                      <div className="alert-vals mono">
                        {formatValue(alert.value)} {metricUnits[alert.metric] || ""}
                        <span className="dot" />
                        limit {formatValue(alert.threshold)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          <article className="card card-matrix">
            <header className="card-header">
              <div>
                <div className="card-eyebrow"><Icon name="pulse" /> Matrix</div>
                <h2 className="card-title">Threshold heatmap</h2>
              </div>
              <span className="card-meta">All cities · all signals</span>
            </header>
            <div className="matrix-frame">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>City</th>
                    {Object.entries(metricLabels).map(([k, v]) => (
                      <th key={k}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zoneSnapshots.map((zone) => (
                    <tr key={zone.id}>
                      <th scope="row">
                        <button
                          type="button"
                          className="matrix-zone"
                          onClick={() => setSelectedZone(zone.id === selectedZone ? "all" : zone.id)}
                        >
                          {zone.name}
                        </button>
                      </th>
                      {Object.keys(metricLabels).map((m) => {
                        const r = latestByZoneMetric.get(`${zone.id}:${m}`);
                        const t = zone.thresholds?.[m];
                        const tone = ratioTone(r?.value / t);
                        const pct = r && t ? Math.round((r.value / t) * 100) : 0;
                        return (
                          <td key={m} className={`heat-cell heat-${tone}`}>
                            <div className="heat-value mono">{formatValue(r?.value)}</div>
                            <div className="heat-bar"><span style={{ width: `${Math.min(160, pct)}%` }} /></div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <footer className="footer">
          <div>
            <span className="footer-brand">UrbanSignal</span>
            <span className="footer-sep">·</span>
            <span>{zones.length || 8} cities · {totalSensors} sensors · {rangeFullLabels[range]}</span>
          </div>
          <div className="footer-links">
            <a href={`${API_BASE}/api/reports/compliance?${reportQuery}`} target="_blank" rel="noreferrer">JSON report</a>
            <a href={`${API_BASE}/api/reports/compliance.csv?${reportQuery}`}>CSV report</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
