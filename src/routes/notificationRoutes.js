import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireHouseholdMember } from '../middlewares/authorize.js';
import { listNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// list notifications for the current user (optional query ?unread=true)
// Household-scoped listing (for household members)
router.get('/households/:householdId/notifications', authMiddleware, requireHouseholdMember(req => req.params.householdId), listNotifications);

// User-scoped listing: return notifications for the authenticated user.
// This is useful for users without a household or for personal notifications.
router.get('/notifications', authMiddleware, listNotifications);

// mark single notification as read
router.post('/notifications/:id/read', authMiddleware, markAsRead);

// mark all notifications for current user as read
router.post('/notifications/read-all', authMiddleware, markAllAsRead);

export default router;
