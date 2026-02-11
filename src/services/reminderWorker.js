import Reminder from "../models/Reminder.js";
import User from "../models/User.js";
import { Op } from 'sequelize';
import reminderQueue from "./reminderQueue.js";

// pluggable sender - uses SMTP if configured, otherwise falls back to console.log
// Default sender implementation (can be overridden in tests via setSender)
let sender = {
  send: async (rem) => {
    const SMTP_HOST = process.env.SMTP_HOST;
    if (!SMTP_HOST) {
      console.log('[reminderWorker] (no SMTP) sendReminder', rem.id, rem.title);
      return;
    }

    // dynamic import to avoid requiring nodemailer when not configured/installed
    let nodemailer;
    try {
      nodemailer = await import('nodemailer');
    } catch (err) {
      console.warn('nodemailer not installed; cannot send email. Install nodemailer or unset SMTP_HOST.');
      console.log('[reminderWorker] (no nodemailer) sendReminder', rem.id, rem.title);
      return;
    }
    const nm = nodemailer.default || nodemailer;

    const transporter = nm.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    const from = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
    const to = rem.email || rem.userEmail || null;
    // try to load user email if missing
    if (!to) {
      try {
        const user = await (await import('../models/User.js')).default.findByPk(rem.userId);
        if (user) {
          rem.userEmail = user.email;
        }
      } catch (e) {
        // ignore
      }
    }

    const toAddr = rem.userEmail || to;
    if (!toAddr) {
      console.warn('[reminderWorker] no recipient email for reminder', rem.id);
      return;
    }

    const mail = {
      from,
      to: toAddr,
      subject: `Reminder: ${rem.title}`,
      text: rem.title + (rem.notes ? '\n\n' + rem.notes : ''),
    };

    await transporter.sendMail(mail);
    console.log('[reminderWorker] email sent for reminder', rem.id, 'to', toAddr);
  }
};

export const setSender = (s) => { sender = s; };

export const sendReminder = async (rem) => {
  return sender.send(rem);
};

export const processDueReminders = async (opts = { householdId: null }) => {
  // This worker handles two notification events for reminders:
  //  - pre-notification: 1 hour before remindAt (preNotified=false)
  //  - final notification: at remindAt (finalNotified=false)
  const now = new Date();
  const preCutoff = new Date(now.getTime() + 60 * 60 * 1000); // now + 1 hour

  // Build where clause: either pre-notify candidates or final-notify candidates
  const where = {
    [Op.or]: [
      { preNotified: false, remindAt: { [Op.lte]: preCutoff, [Op.gt]: now } },
      { finalNotified: false, remindAt: { [Op.lte]: now } }
    ]
  };

  if (opts.householdId) {
    // restrict to users in household
    const users = await User.findAll({ where: { householdId: opts.householdId }, attributes: ['id'] });
    const ids = users.map(u => u.id);
    if (ids.length === 0) return [];
    where.userId = { [Op.in]: ids };
  }

  const reminders = await Reminder.findAll({ where });
  const processed = [];

  for (const r of reminders) {
    try {
      // determine which notification to send: final takes precedence
      if (r.remindAt && r.remindAt <= now && !r.finalNotified) {
        // Final notification: at time
        // create Notification records for recipients and enqueue/send email
        const Notification = (await import('../models/Notification.js')).default;

        // determine recipients: if shared -> all household members, else only the owner
        let recipients = [r.userId];
        if (r.shared) {
          const owner = await User.findByPk(r.userId);
          if (owner && owner.householdId) {
            const members = await User.findAll({ where: { householdId: owner.householdId }, attributes: ['id', 'email'] });
            recipients = members.map(m => m.id);
          }
        }

  const notifyRecords = recipients.map(uid => ({ userId: uid, type: 'reminder', payload: { reminderId: r.id, title: r.title, remindAt: r.remindAt, state: 'Adesso' }, delivered: false }));
        if (notifyRecords.length > 0) await Notification.bulkCreate(notifyRecords);

        // enqueue/send email via queue
        const attempts = process.env.REMINDER_ATTEMPTS ? parseInt(process.env.REMINDER_ATTEMPTS, 10) : 3;
        const backoffMs = process.env.REMINDER_BACKOFF_MS ? parseInt(process.env.REMINDER_BACKOFF_MS, 10) : 1000;
        const q = await reminderQueue.enqueueReminder({ reminderId: r.id }, { attempts, backoff: { type: 'exponential', delay: backoffMs } });
        if (!q) {
          // process inline
          await retryAsync(() => sender.send(r), attempts, backoffMs);
          r.sent = true;
        }
        // mark finalNotified; auto-archive by default unless explicitly disabled
        // Set REMINDER_AUTO_ARCHIVE=false to disable auto-archival
        const autoArchive = process.env.REMINDER_AUTO_ARCHIVE === 'false' ? false : true;
        r.finalNotified = true;
        if (autoArchive) r.completed = true;
        await r.save();
        processed.push(r);
      } else if (r.remindAt && r.remindAt > now && r.remindAt <= preCutoff && !r.preNotified) {
        // Pre-notification: 1 hour before
        const Notification = (await import('../models/Notification.js')).default;

        let recipients = [r.userId];
        if (r.shared) {
          const owner = await User.findByPk(r.userId);
          if (owner && owner.householdId) {
            const members = await User.findAll({ where: { householdId: owner.householdId }, attributes: ['id', 'email'] });
            recipients = members.map(m => m.id);
          }
        }

  const notifyRecords = recipients.map(uid => ({ userId: uid, type: 'reminder_pre', payload: { reminderId: r.id, title: r.title, remindAt: r.remindAt, state: 'Tra un\'ora' }, delivered: false }));
        if (notifyRecords.length > 0) await Notification.bulkCreate(notifyRecords);

        // Optionally send a short email for pre-notify if desired; controlled by env REMINDER_SEND_PRE_EMAIL
        if (process.env.REMINDER_SEND_PRE_EMAIL === 'true') {
          try {
            await retryAsync(() => sender.send({ ...r, title: `Reminder in 1 hour: ${r.title}` }), 1, 500);
          } catch (e) {
            console.warn('Pre-notification email failed for reminder', r.id, e && e.message);
          }
        }

        r.preNotified = true;
        await r.save();
        processed.push(r);
      }
    } catch (err) {
      console.error('Failed processing reminder notifications for', r.id, err && err.message);
    }
  }
  return processed;
};

// simple retry helper with exponential backoff
export const retryAsync = async (fn, attempts = 3, backoffMs = 1000) => {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const delay = backoffMs * Math.pow(2, i);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastErr;
};

export const processReminderJob = async (data) => {
  // data: { reminderId } or { type: 'budget_alert', householdId, month, users: [{id,email}], monthlyBudget, monthTotal }
  if (data && data.type === 'budget_alert') {
    const { householdId, month, users, monthlyBudget, monthTotal } = data;
    // send emails to listed users and mark Notifications for this household/month as delivered
    for (const u of users || []) {
      try {
        await sendReminder({ id: `budget-${householdId}-${month}-${u.id}`, title: `Household budget at 70%`, notes: `Your household has reached ${Math.round((monthTotal / monthlyBudget) * 100)}% of the monthly budget (${monthTotal}/${monthlyBudget}) for ${month}.`, userId: u.id, userEmail: u.email });
      } catch (err) {
        console.error('Failed sending budget alert to', u.email, err && err.message);
      }
    }
    try {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.update({ delivered: true }, { where: { type: 'budget_threshold', ['payload']: { [Op.ne]: null } } });
      // Note: payload search is generic here; UI should correlate notifications by household/month
    } catch (err) {
      console.error('Failed to mark notifications delivered', err && err.message);
    }
    return { type: 'budget_alert', householdId, month };
  }

  // data: { reminderId }
  const r = await Reminder.findByPk(data.reminderId);
  if (!r) return null;
  try {
    await sendReminder(r);
    r.sent = true;
    await r.save();
    return r;
  } catch (err) {
    console.error('Error processing reminder job', err);
    throw err;
  }
};

export const startWorker = (intervalMs = 60_000) => {
  const id = setInterval(async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('Reminder worker error', err);
    }
  }, intervalMs);
  return () => clearInterval(id);
};

export default { sendReminder, processDueReminders, startWorker };
