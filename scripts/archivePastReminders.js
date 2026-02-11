// One-off script to mark as completed any reminders whose remindAt <= now
import Reminder from '../src/models/Reminder.js';

const run = async () => {
  try {
    const now = new Date();
    const toArchive = await Reminder.findAll({ where: { remindAt: { ['lte']: now } } });
    // sequelize operator workaround for raw script: use JS filter if necessary
    const fallback = await Reminder.findAll();
    const candidates = toArchive.length ? toArchive : fallback.filter(r => new Date(r.remindAt) <= now && !r.completed);
    console.log('Found', candidates.length, 'reminders to archive');
    for (const r of candidates) {
      if (!r.completed) {
        r.completed = true;
        await r.save();
        console.log('Archived reminder', r.id);
      }
    }
  } catch (err) {
    console.error('archive script failed', err && err.message);
    process.exitCode = 2;
  }
  process.exit(0);
};

run();
