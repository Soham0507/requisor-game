import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScoreSchema, insertEmailCaptureSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get top scores for leaderboard
  app.get("/api/scores", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topScores = await storage.getTopScores(limit);
      res.json(topScores);
    } catch (error) {
      console.error("Error fetching scores:", error);
      res.status(500).json({ error: "Failed to fetch scores" });
    }
  });

  // Submit a new score
  app.post("/api/scores", async (req, res) => {
    try {
      const validatedData = insertScoreSchema.parse(req.body);
      const newScore = await storage.createScore(validatedData);
      res.status(201).json(newScore);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        const validationError = fromError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error creating score:", error);
        res.status(500).json({ error: "Failed to create score" });
      }
    }
  });

  // Capture email for lead generation
  app.post("/api/capture-email", async (req, res) => {
    try {
      const validatedData = insertEmailCaptureSchema.parse(req.body);
      const capture = await storage.captureEmail(validatedData);
      res.status(201).json({ success: true, id: capture.id });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        const validationError = fromError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        console.error("Error capturing email:", error);
        res.status(500).json({ error: "Failed to capture email" });
      }
    }
  });

  app.delete("/api/scores/all", async (_req, res) => {
    try {
      await storage.deleteAllScores();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scores:", error);
      res.status(500).json({ error: "Failed to delete scores" });
    }
  });

  return httpServer;
}
