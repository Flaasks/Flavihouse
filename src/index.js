import express from "express";
import dotenv from "dotenv";
import initDb from "./db/init.js";
import app from "./app.js";
import reminderWorker from "./services/reminderWorker.js";
import reminderQueue from "./services/reminderQueue.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not set. Exiting.");
        process.exit(1);
      }

      await initDb();

      const server = app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });

      // start reminder worker (runs every 60s by default)
      const stopWorker = reminderWorker.startWorker(process.env.REMINDER_WORKER_INTERVAL_MS ? parseInt(process.env.REMINDER_WORKER_INTERVAL_MS, 10) : 60_000);

      // If a Redis-backed queue is available, wire the queue processor to process reminder jobs
      let stopQueue = async () => {};
      try {
        stopQueue = await reminderQueue.startProcessing(reminderWorker.processReminderJob);
      } catch (err) {
        console.warn('Reminder queue processor not started:', err.message || err);
      }

      // Graceful shutdown
      const shutdown = async () => {
        console.log('Shutting down...');
        stopWorker();
        try { stopQueue(); } catch (e) { /* ignore */ }
        server.close(() => process.exit(0));
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  })();
}
