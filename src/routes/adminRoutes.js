import express from "express";
import { setUserRole, getHouseholdUsers } from "../controllers/adminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireHouseholdAdmin, requireHouseholdMember } from "../middlewares/authorize.js";

const router = express.Router();

router.post("/:householdId/users/:userId/role", authMiddleware, requireHouseholdAdmin(req => req.params.householdId), setUserRole);

// Members of a household can view the list of users in their household
router.get("/:householdId/users", authMiddleware, requireHouseholdMember(req => req.params.householdId), getHouseholdUsers);
// Budget endpoints
router.get('/:householdId/budget', authMiddleware, requireHouseholdMember(req => req.params.householdId), (req, res, next) => import('../controllers/adminController.js').then(m => m.getHouseholdBudget(req, res, next)));
router.put('/:householdId/budget', authMiddleware, requireHouseholdAdmin(req => req.params.householdId), (req, res, next) => import('../controllers/adminController.js').then(m => m.setHouseholdBudget(req, res, next)));

export default router;
