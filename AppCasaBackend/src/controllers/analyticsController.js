import Expense from '../models/Expense.js';
import { Op, fn, col, literal } from 'sequelize';

// GET summary by category and by month for a household between optional from/to dates
export const expenseSummary = async (req, res) => {
  try {
    const { householdId } = req.params;
    const range = req.query.range || null; // e.g., current_month, previous_month, last_6_months, last_year, week
    const weekStart = req.query.weekStart || null; // YYYY-MM-DD for week range
    let from = req.query.from ? new Date(req.query.from) : null;
    let to = req.query.to ? new Date(req.query.to) : null;

  // helper to compute ranges; allow overriding 'today' for deterministic queries/tests via ?asOf=YYYY-MM-DD
  const today = req.query.asOf ? new Date(req.query.asOf) : new Date();
    const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

    if (range) {
      if (range === 'current_month') {
        from = startOfMonth(today);
        to = endOfMonth(today);
      } else if (range === 'previous_month') {
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = startOfMonth(prev);
        to = endOfMonth(prev);
      } else if (range === 'last_6_months') {
        const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        from = startOfMonth(start);
        to = endOfMonth(today);
      } else if (range === 'last_year') {
        const start = new Date(today.getFullYear() - 1, today.getMonth() + 1, 1);
        from = startOfMonth(start);
        to = endOfMonth(today);
      } else if (range === 'week') {
        // weekStart overrides: consider week as 7 days from weekStart
        if (weekStart) {
          from = new Date(weekStart);
          to = new Date(from.getTime() + 6 * 24 * 60 * 60 * 1000);
        } else {
          // default: current week starting Monday
          const day = today.getDay(); // 0 Sun - 6 Sat
          const diffToMon = (day + 6) % 7; // days since Monday
          from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMon);
          to = new Date(from.getTime() + 6 * 24 * 60 * 60 * 1000);
        }
      }
    }

    const where = { householdId };
    if (from) where.date = { [Op.gte]: from };
    if (to) where.date = where.date ? { ...where.date, [Op.lte]: to } : { [Op.lte]: to };

    // total by category
    const byCategory = await Expense.findAll({
      attributes: ['category', [fn('SUM', col('amount')), 'total']],
      where,
      group: ['category'],
      raw: true,
    });

    // total by month (YYYY-MM) - dialect specific
    const dialect = Expense.sequelize.getDialect();
    const monthExpr = dialect === 'sqlite' ? "strftime('%Y-%m', date)" : "to_char(date, 'YYYY-MM')";
    const byMonth = await Expense.findAll({
      attributes: [[literal(monthExpr), 'month'], [fn('SUM', col('amount')), 'total']],
      where,
      group: [literal(monthExpr)],
      order: [[literal(monthExpr), 'ASC']],
      raw: true,
    });

    // total over the window and monthly average
    const total = (await Expense.sum('amount', { where })) || 0;
    let monthsCount = 1;
    if (from && to) {
      monthsCount = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
      if (monthsCount < 1) monthsCount = 1;
    } else if (byMonth && byMonth.length) {
      monthsCount = byMonth.length;
    }
    const monthlyAverage = monthsCount ? total / monthsCount : total;

  res.json({ total, monthlyAverage, byCategory, byMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export default { expenseSummary };
