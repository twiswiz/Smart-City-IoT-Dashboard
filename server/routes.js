import express from "express";
import { evaluateReading } from "./alertEngine.js";
import { getReport, listAlerts, listReadings, listZones, reportToCsv, saveReading } from "./storage.js";

export function createRoutes(io) {
  const router = express.Router();

  async function ingest(reading) {
    const savedReading = await saveReading(reading);
    io.emit("reading", savedReading);
    const alert = await evaluateReading(savedReading);
    if (alert) io.emit("alert", alert);
    return { reading: savedReading, alert };
  }

  router.post("/readings", async (req, res, next) => {
    try {
      const result = await ingest(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/readings", async (req, res, next) => {
    try {
      res.json(await listReadings(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/alerts", async (req, res, next) => {
    try {
      res.json(await listAlerts(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/zones", async (_req, res, next) => {
    try {
      res.json(await listZones());
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports/compliance", async (req, res, next) => {
    try {
      res.json(await getReport(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/reports/compliance.csv", async (req, res, next) => {
    try {
      const report = await getReport(req.query);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=smart-city-compliance.csv");
      res.send(reportToCsv(report));
    } catch (error) {
      next(error);
    }
  });

  return { router, ingest };
}
