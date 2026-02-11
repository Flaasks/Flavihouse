import express from 'express';
import { expenseSummary } from '../controllers/analyticsController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requireHouseholdMember } from '../middlewares/authorize.js';

const router = express.Router();

router.get('/households/:householdId/expenses/summary', authMiddleware, requireHouseholdMember(req => req.params.householdId), expenseSummary);

export default router;
