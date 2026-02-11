let Queue = null;
let queue = null;

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS;

const ensureQueue = async () => {
  if (queue) return queue;
  if (!REDIS_URL) return null;
  try {
    const bull = await import('bull');
    Queue = bull.default || bull;
    queue = new Queue('reminders', REDIS_URL);
    return queue;
  } catch (err) {
    console.warn('Bull/Redis not available, falling back to in-process reminder handling', err.message || err);
    queue = null;
    return null;
  }
};

// interface: enqueueReminder(payload) -> job or null
// enqueueReminder(payload, options) -> job or null. options is passed to queue.add
export const enqueueReminder = async (payload, options = {}) => {
  const q = await ensureQueue();
  if (q) return q.add(payload, options);
  // fallback: nothing to enqueue; caller should handle inline processing
  return null;
};

// process returns an async stop function
export const startProcessing = async (processor) => {
  const q = await ensureQueue();
  if (q) {
    q.process(async (job) => processor(job.data));
    return async () => {
      try { await q.close(); } catch (e) { /* ignore */ }
    };
  }
  // no queue available: return noop stop and caller should handle inline processing
  return async () => {};
};

export default { enqueueReminder, startProcessing };
