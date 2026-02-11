import express from "express";
import {
  listExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  splitExpense,
  getExpenseShares,
} from "../controllers/expenseController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireHouseholdAdmin, requireHouseholdMember } from "../middlewares/authorize.js";

const router = express.Router();

router.use(authMiddleware);

const resolveExpenseHousehold = async (req) => {
  const mod = await import('../models/Expense.js');
  const Expense = mod.default;
  const e = await Expense.findByPk(req.params.id);
  return e?.householdId || null;
};

router.get("/", requireHouseholdMember(req => req.query.householdId || req.body.householdId), listExpenses);
router.post("/", requireHouseholdMember(req => req.body.householdId), createExpense);
router.post("/:id/split", requireHouseholdMember(resolveExpenseHousehold), splitExpense);
router.get("/:id", requireHouseholdMember(resolveExpenseHousehold), getExpense);
router.get("/:id/shares", requireHouseholdMember(resolveExpenseHousehold), getExpenseShares);
router.put("/:id", requireHouseholdMember(resolveExpenseHousehold), updateExpense);
router.delete(
  "/:id",
  requireHouseholdAdmin(resolveExpenseHousehold),
  deleteExpense
);

export default router;
