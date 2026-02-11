import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const listNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread } = req.query;
    const where = { userId };
    if (unread === 'true') where.delivered = false;
    const nots = await Notification.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(nots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const n = await Notification.findByPk(id);
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    if (n.userId !== userId) return res.status(403).json({ message: 'Forbidden' });
    n.delivered = true;
    await n.save();
    res.json({ message: 'Marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.update({ delivered: true }, { where: { userId } });
    res.json({ message: 'All marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export default { listNotifications, markAsRead };
