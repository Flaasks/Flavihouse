import Reminder from "../models/Reminder.js";
import { Op } from 'sequelize';
import reminderWorker from "../services/reminderWorker.js";

export const listReminders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await (await import('../models/User.js')).default.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // show private reminders for the user, plus shared reminders for the household
    const reminders = await Reminder.findAll({ where: { [Op.or]: [{ userId }, { shared: true } ] } });
    // filter shared reminders by household membership (ensure user belongs to same household as reminder owner)
    const filtered = [];
    for (const r of reminders) {
      if (r.userId === userId) filtered.push(r);
      else if (r.shared) {
        const owner = await (await import('../models/User.js')).default.findByPk(r.userId);
        if (owner && owner.householdId === user.householdId) filtered.push(r);
      }
    }
    // split into active (not completed) and done (completed)
    const active = filtered.filter(r => !r.completed).sort((a,b)=>new Date(a.remindAt)-new Date(b.remindAt));
    const done = filtered.filter(r => r.completed).sort((a,b)=>new Date(b.remindAt)-new Date(a.remindAt));
    res.json({ active, done });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const createReminder = async (req, res) => {
  try {
    const { userId: bodyUserId, title, remindAt, shared } = req.body;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: 'Unauthorized' });
    if (!title) return res.status(400).json({ message: 'title required' });
    if (!remindAt) return res.status(400).json({ message: 'remindAt required' });
    // validate remindAt is a valid date
    const dt = new Date(remindAt);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ message: 'remindAt invalid datetime' });
    // Determine owner: default to actor. Only admins can create for others.
    let ownerId = actorId;
    if (bodyUserId && parseInt(bodyUserId, 10) !== actorId) {
      const actor = await (await import('../models/User.js')).default.findByPk(actorId);
      if (!actor || actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can create reminders for other users' });
      ownerId = bodyUserId;
    }
    const r = await Reminder.create({ userId: ownerId, title, remindAt: dt.toISOString(), sent: false, shared: !!shared });
    res.status(201).json(r);
  } catch (err) {
    console.error('createReminder error:', err && err.message);
    res.status(500).json({ message: err && err.message ? String(err.message) : 'Errore server' });
  }
};

export const markDone = async (req, res) => {
  try {
    const rem = await Reminder.findByPk(req.params.id);
    if (!rem) return res.status(404).json({ message: 'Reminder non trovato' });
    const actor = await (await import('../models/User.js')).default.findByPk(req.user?.id);
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (rem.userId !== actor.id) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      const owner = await (await import('../models/User.js')).default.findByPk(rem.userId);
      if (!owner || owner.householdId !== actor.householdId) return res.status(403).json({ message: 'Forbidden' });
    }
    rem.completed = true;
    rem.sent = true;
    await rem.save();
    res.json(rem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const rem = await Reminder.findByPk(req.params.id);
    if (!rem) return res.status(404).json({ message: 'Reminder non trovato' });
    const actor = await (await import('../models/User.js')).default.findByPk(req.user.id);
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    // allow deletion if actor is the owner or an admin in the same household
    if (rem.userId !== actor.id) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
      // if admin, ensure they belong to same household as reminder owner
      const owner = await (await import('../models/User.js')).default.findByPk(rem.userId);
      if (!owner || owner.householdId !== actor.householdId) return res.status(403).json({ message: 'Forbidden' });
    }
    await rem.destroy();
    res.json({ message: 'Eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const forceSendDueReminders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await (await import('../models/User.js')).default.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const processed = await reminderWorker.processDueReminders({ householdId: user.householdId });
    res.json({ sent: processed.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const forceSendAllReminders = async (req, res) => {
  try {
    const processed = await reminderWorker.processDueReminders();
    res.json({ sent: processed.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};
