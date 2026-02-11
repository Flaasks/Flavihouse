import express from "express";
import * as taskCtrl from "../controllers/taskController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireHouseholdMember, requireAssignedOrHouseholdMember, requireHouseholdAdmin } from "../middlewares/authorize.js";

const router = express.Router();

router.get("/", authMiddleware, requireHouseholdMember(req => req.query.householdId || req.body.householdId), taskCtrl.listTasks);
router.post("/", authMiddleware, requireHouseholdMember(req => req.body.householdId), taskCtrl.createTask);
router.post("/:id/assign", authMiddleware, requireHouseholdMember(async (req) => {
	const mod = await import('../models/Task.js');
	const TaskModel = mod.default;
	const t = await TaskModel.findByPk(req.params.id);
	return t?.householdId || null;
}), taskCtrl.assignTask);
router.post("/:id/complete", authMiddleware, requireAssignedOrHouseholdMember('task'), taskCtrl.completeTask);
router.delete(
	"/:id",
	authMiddleware,
	requireHouseholdAdmin(async (req) => {
		const mod = await import('../models/Task.js');
		const TaskModel = mod.default;
		const t = await TaskModel.findByPk(req.params.id);
		return t?.householdId || null;
	}),
	taskCtrl.deleteTask
);

export default router;
