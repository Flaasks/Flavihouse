import express from "express";
import * as remCtrl from "../controllers/reminderController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireHouseholdMember, requireAssignedOrHouseholdMember, requireHouseholdMemberForUserId, requireHouseholdAdmin } from "../middlewares/authorize.js";

const router = express.Router();

router.get("/", authMiddleware, remCtrl.listReminders);
router.post("/", authMiddleware, remCtrl.createReminder);
router.post("/:id/done", authMiddleware, requireAssignedOrHouseholdMember('reminder'), remCtrl.markDone);
import User from '../models/User.js';

router.post('/force-send', authMiddleware, requireHouseholdMember(async (req) => {
	// resolve household from authenticated user by loading user record
	if (!req.user?.id) return null;
	const u = await User.findByPk(req.user.id);
	return u?.householdId || null;
}), remCtrl.forceSendDueReminders);

// admin-only: force send all due reminders across households (useful for testing)
router.post('/force-send/all', authMiddleware, requireHouseholdAdmin(async (req) => {
	// householdId param is not used for admin all, but requireHouseholdAdmin expects a value; use user's household
	return req.user?.householdId || null;
}), remCtrl.forceSendAllReminders);
router.delete(
	"/:id",
	authMiddleware,
	// allow the assigned/owning user or household members through middleware; controller will still enforce owner/admin rules
	requireAssignedOrHouseholdMember('reminder'),
	remCtrl.deleteReminder
);

export default router;
