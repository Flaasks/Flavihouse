import express from "express";
import { listItems, createItem, toggleItem, deleteItem } from "../controllers/shoppingController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { requireHouseholdMember, requireAssignedOrHouseholdMember, requireHouseholdAdmin } from "../middlewares/authorize.js";
import ShoppingItem from "../models/ShoppingItem.js";

const router = express.Router();

router.get("/", authMiddleware, requireHouseholdMember(req => req.query.householdId || req.body.householdId), listItems);
router.post("/", authMiddleware, requireHouseholdMember(req => req.body.householdId), createItem);
router.post("/:id/toggle", authMiddleware, requireAssignedOrHouseholdMember('shopping'), toggleItem);
// middleware: load item and 404 if not found
const loadItem = async (req, res, next) => {
	const it = await ShoppingItem.findByPk(req.params.id);
	if (!it) return res.status(404).json({ message: 'Item non trovato' });
	req.loadedItem = it;
	next();
};

router.delete(
	"/:id",
	authMiddleware,
	loadItem,
	requireHouseholdAdmin(req => req.loadedItem.householdId),
	deleteItem
);

export default router;
