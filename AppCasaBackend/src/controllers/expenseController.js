import Expense from "../models/Expense.js";
import ExpenseShare from "../models/ExpenseShare.js";
import User from "../models/User.js";
import Household from "../models/Household.js";
import Notification from "../models/Notification.js";
import sequelize from "../config/db.js";
import { Op } from 'sequelize';
import { sendReminder } from '../services/reminderWorker.js';
import reminderQueue from '../services/reminderQueue.js';

// helper to create expense shares (equal split)
const createSharesEqual = async (expense, users, t) => {
  const total = parseFloat(expense.amount);
  const per = Math.floor((total / users.length) * 100) / 100; // cents floor
  const shares = [];
  let allocated = 0;
  for (let i = 0; i < users.length; i++) {
    let amt = per;
    // last user gets remainder
    if (i === users.length - 1) amt = +(total - allocated).toFixed(2);
    else allocated += amt;
    shares.push({ expenseId: expense.id, userId: users[i].id, amount: amt });
  }
  return ExpenseShare.bulkCreate(shares, { transaction: t });
};

// custom shares: supports explicit amounts, percent or weight-based shares
const createSharesCustom = async (expense, sharesInput, mode = 'amount', t) => {
  const total = parseFloat(expense.amount);
  let computed = [];

    if (mode === 'amount') {
    const sum = sharesInput.reduce((s, it) => s + parseFloat(it.amount), 0);
    if (Math.abs(sum - total) > 0.01) {
      const e = new Error('Shares do not sum to expense amount');
      e.code = 'SPLIT_VALIDATION';
      throw e;
    }
    computed = sharesInput.map(it => ({ userId: it.userId, amount: +parseFloat(it.amount).toFixed(2) }));
  } else if (mode === 'percent') {
    // sharesInput: [{ userId, percent }]
    const sumP = sharesInput.reduce((s, it) => s + parseFloat(it.percent), 0);
    if (Math.abs(sumP - 100) > 0.01) {
      const e = new Error('Percents must sum to 100');
      e.code = 'SPLIT_VALIDATION';
      throw e;
    }
    computed = sharesInput.map(it => ({ userId: it.userId, amount: +((total * parseFloat(it.percent) / 100).toFixed(2)) }));
  } else if (mode === 'weight') {
    // sharesInput: [{ userId, weight }]
    const sumW = sharesInput.reduce((s, it) => s + parseFloat(it.weight), 0);
    if (sumW <= 0) {
      const e = new Error('Invalid weights');
      e.code = 'SPLIT_VALIDATION';
      throw e;
    }
    computed = sharesInput.map(it => ({ userId: it.userId, amount: +((total * parseFloat(it.weight) / sumW).toFixed(2)) }));
    // adjust rounding remainder
    const sumAmt = computed.reduce((s, it) => s + it.amount, 0);
    const diff = +(total - sumAmt).toFixed(2);
    if (Math.abs(diff) >= 0.01) {
      computed[computed.length - 1].amount = +(computed[computed.length - 1].amount + diff).toFixed(2);
    }
  }

  const shares = computed.map(it => ({ expenseId: expense.id, userId: it.userId, amount: it.amount }));
  return ExpenseShare.bulkCreate(shares, { transaction: t });
};

export const listExpenses = async (req, res) => {
  try {
    const householdId = req.query.householdId || req.body.householdId || null;
    if (!householdId) return res.status(400).json({ message: 'householdId required' });
    const expenses = await Expense.findAll({ where: { householdId } });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
};

export const createExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { householdId, category, description, amount, date, splitType, shares, splitMode } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // validate household users if shares provided
    if (Array.isArray(shares) && shares.length > 0) {
      const userIds = Array.from(new Set(shares.map(s => s.userId)));
      const users = await User.findAll({ where: { id: userIds, householdId } });
      if (users.length !== userIds.length) {
        await t.rollback();
        return res.status(400).json({ message: 'Some users are not in the household' });
      }
    }

    const expense = await Expense.create({ householdId, userId, category, description, amount, date, splitType }, { transaction: t });

    // handle splitting within transaction
    if (splitType === 'equal') {
      const users = await User.findAll({ where: { householdId } });
      await createSharesEqual(expense, users, t);
    } else if (splitType === 'custom' && Array.isArray(shares)) {
      const mode = splitMode || 'amount';
      await createSharesCustom(expense, shares, mode, t);
    }

    await t.commit();

    // After creating expense, check household monthly budget and maybe send alerts
    try {
      const hh = await Household.findByPk(householdId);
      if (hh && hh.monthlyBudget) {
        // determine month window from expense date (or today)
        const d = date ? new Date(date) : new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        // sum household expenses in that month
  const monthTotal = await Expense.sum('amount', { where: { householdId, date: { [Op.gte]: start, [Op.lte]: end } } }) || 0;
        const monthlyBudget = parseFloat(hh.monthlyBudget);
        const threshold = monthlyBudget * 0.7;
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthTotal >= threshold) {
              // attempt to atomically mark that we've sent an alert for this month
              const [updated] = await Household.update(
                { budgetAlertMonth: monthKey },
                { where: { id: householdId, [Op.or]: [{ budgetAlertMonth: null }, { budgetAlertMonth: { [Op.ne]: monthKey } }] } }
              );
              if (updated === 0) {
                // another process already handled alert for this month
              } else {
                // create notifications for household members
                const users = await User.findAll({ where: { householdId } });
                const notifyRecords = users.map(u => ({ userId: u.id, type: 'budget_threshold', payload: { householdId, month: monthKey, monthlyBudget, monthTotal }, delivered: false }));
                await Notification.bulkCreate(notifyRecords);

                // enqueue a budget alert job if a queue exists; otherwise fall back to inline sends
                const payload = { type: 'budget_alert', householdId, month: monthKey, monthlyBudget, monthTotal, users: users.map(u => ({ id: u.id, email: u.email })) };
                try {
                  const job = await reminderQueue.enqueueReminder(payload, { jobId: `budget-${householdId}-${monthKey}`, attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
                  if (!job) {
                    // no queue available: send inline
                    for (const u of users) {
                      try {
                        await sendReminder({ id: `budget-${householdId}-${monthKey}-${u.id}`, title: `Household budget at 70%`, notes: `Your household has reached ${Math.round((monthTotal / monthlyBudget) * 100)}% of the monthly budget (${monthTotal}/${monthlyBudget}) for ${monthKey}.`, userId: u.id, userEmail: u.email });
                      } catch (e) {
                        console.warn('Failed to send budget alert email to', u.email, e && e.message);
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Failed to enqueue budget alert job, falling back to inline sends', e && e.message);
                  for (const u of users) {
                    try {
                      await sendReminder({ id: `budget-${householdId}-${monthKey}-${u.id}`, title: `Household budget at 70%`, notes: `Your household has reached ${Math.round((monthTotal / monthlyBudget) * 100)}% of the monthly budget (${monthTotal}/${monthlyBudget}) for ${monthKey}.`, userId: u.id, userEmail: u.email });
                    } catch (ee) {
                      console.warn('Failed to send budget alert email to', u.email, ee && ee.message);
                    }
                  }
                }
              }
        }
      }
    } catch (e) {
      console.warn('Error checking/sending budget alerts', e && e.message);
    }
    res.status(201).json(expense);
  } catch (err) {
    // treat predictable split validation errors as client errors
    if (err && err.code === 'SPLIT_VALIDATION') {
      await t.rollback();
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    await t.rollback();
    res.status(500).json({ message: "Errore server" });
  }
};

export const splitExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ message: 'Expense non trovato' });
    }
    const { type, shares, mode } = req.body; // type: 'equal'|'custom', mode: 'amount'|'percent'|'weight'

    // validate users for custom
    if (type === 'custom' && Array.isArray(shares)) {
      const userIds = Array.from(new Set(shares.map(s => s.userId)));
      const users = await User.findAll({ where: { id: userIds, householdId: expense.householdId } });
      if (users.length !== userIds.length) {
        await t.rollback();
        return res.status(400).json({ message: 'Some users are not in the household' });
      }
    }

    // remove existing shares
    await ExpenseShare.destroy({ where: { expenseId: expense.id }, transaction: t });

    if (type === 'equal') {
      const users = await User.findAll({ where: { householdId: expense.householdId } });
      await createSharesEqual(expense, users, t);
    } else if (type === 'custom') {
      if (!Array.isArray(shares)) {
        await t.rollback();
        return res.status(400).json({ message: 'Shares array required for custom split' });
      }
      const m = mode || 'amount';
      await createSharesCustom(expense, shares, m, t);
    } else {
      await t.rollback();
      return res.status(400).json({ message: 'Tipo split non valido' });
    }

    await t.commit();
    const created = await ExpenseShare.findAll({ where: { expenseId: expense.id } });
    res.json({ message: 'Split applicato', shares: created });
  } catch (err) {
    if (err && err.code === 'SPLIT_VALIDATION') {
      await t.rollback();
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    await t.rollback();
    res.status(500).json({ message: 'Errore server' });
  }
};

export const getExpenseShares = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const shares = await ExpenseShare.findAll({ where: { expenseId } });
    res.json(shares);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense non trovato" });
    res.json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense non trovato" });
    await expense.update(req.body);
    res.json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense non trovato" });
    await expense.destroy();
    res.json({ message: "Eliminato" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
};
