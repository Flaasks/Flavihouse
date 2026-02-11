import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import reminderWorker from './services/reminderWorker.js';
import reminderQueue from './services/reminderQueue.js';

const app = express();
let stopWorker = null;
let stopQueue = null;

const start = async () => {
  console.log('Starting background worker...');
  // start queue processors if any
  try {
    stopQueue = await reminderQueue.startProcessing(reminderWorker.processReminderJob);
  } catch (e) {
    console.warn('Failed starting queue processor', e && e.message);
    stopQueue = async () => {};
  }
  // start periodic reminder checker (runs every minute) and keep a handle to stop it
  const intervalMs = process.env.REMINDER_WORKER_INTERVAL_MS ? parseInt(process.env.REMINDER_WORKER_INTERVAL_MS, 10) : 60_000;
  stopWorker = reminderWorker.startWorker(intervalMs);

  // minimal health endpoint
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  const port = process.env.WORKER_PORT ? parseInt(process.env.WORKER_PORT, 10) : 4000;
  const server = app.listen(port, () => console.log('Worker health listening on', port));

  const shutdown = async () => {
    console.log('Worker shutting down...');
    try {
      if (typeof stopWorker === 'function') stopWorker();
      if (typeof stopQueue === 'function') await stopQueue();
    } catch (e) { console.warn('Error during shutdown', e && e.message); }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => { console.error('Worker failed to start', err && err.message); process.exit(1); });
