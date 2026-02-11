import ShoppingItem from "../models/ShoppingItem.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import sequelize from "../config/db.js";

export const listItems = async (req, res) => {
  try {
    const householdId = req.query.householdId || req.body.householdId || null;
    if (!householdId) return res.status(400).json({ message: 'householdId required' });
    const items = await ShoppingItem.findAll({ where: { householdId } });
    // if includeTotal=true compute sum of amounts for unchecked items
    if (req.query.includeTotal === 'true') {
      const total = await ShoppingItem.sum('amount', { where: { householdId, checked: false } }) || 0;
      return res.json({ items, estimatedTotal: parseFloat(total) });
    }
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
};

export const createItem = async (req, res) => {
  try {
    const { householdId, name, quantity, assignedTo } = req.body;
    const amount = req.body.amount !== undefined ? req.body.amount : null;
    if (!householdId || !name) return res.status(400).json({ message: 'householdId and name required' });
    if (assignedTo) {
      const target = await User.findByPk(assignedTo);
      if (!target || target.householdId !== parseInt(householdId, 10)) {
        return res.status(400).json({ message: 'assignedTo must belong to the household' });
      }
    }
    const item = await ShoppingItem.create({ householdId, name, quantity: quantity || null, assignedTo: assignedTo || null, amount });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const toggleItem = async (req, res) => {
  try {
    const item = await ShoppingItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item non trovato' });
    item.checked = !item.checked;
    // if item became checked, create an Expense for it and remove the shopping item
    if (item.checked) {
      // create expense record using the item's amount if present
      const t = await sequelize.transaction();
      try {
        const expense = await Expense.create({ householdId: item.householdId, userId: req.user.id, category: 'shopping', description: item.name, amount: item.amount || 0, date: new Date() }, { transaction: t });
        await item.destroy({ transaction: t });
        await t.commit();
        return res.json({ createdExpense: expense });
      } catch (e) {
        await t.rollback();
        console.error(e);
        return res.status(500).json({ message: 'Errore creando expense' });
      }
    }
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await ShoppingItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item non trovato' });
    await item.destroy();
    res.json({ message: 'Eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};
