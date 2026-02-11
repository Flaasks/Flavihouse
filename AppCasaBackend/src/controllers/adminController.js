import User from "../models/User.js";

export const setUserRole = async (req, res) => {
  try {
    const { householdId, userId } = req.params;
    const { role } = req.body;
    if (!['member','admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.householdId !== parseInt(householdId,10)) return res.status(403).json({ message: 'Cannot change role of user outside household' });

    user.role = role;
    await user.save();
    res.json({ message: 'Role updated', user: { id: user.id, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const getHouseholdUsers = async (req, res) => {
  try {
    const { householdId } = req.params;
    const users = await User.findAll({ where: { householdId }, attributes: ['id','name','email','role','householdId'] });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const getHouseholdBudget = async (req, res) => {
  try {
    const { householdId } = req.params;
    const hh = await (await import('../models/Household.js')).default.findByPk(householdId);
    if (!hh) return res.status(404).json({ message: 'Household not found' });
    res.json({ monthlyBudget: hh.monthlyBudget || null, budgetAlertMonth: hh.budgetAlertMonth || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const setHouseholdBudget = async (req, res) => {
  try {
    const { householdId } = req.params;
    const { monthlyBudget } = req.body;
    const hh = await (await import('../models/Household.js')).default.findByPk(householdId);
    if (!hh) return res.status(404).json({ message: 'Household not found' });
    hh.monthlyBudget = monthlyBudget !== undefined ? monthlyBudget : hh.monthlyBudget;
    // reset alert month when budget changes so admin can get a fresh alert if desired
    hh.budgetAlertMonth = null;
    await hh.save();
    res.json({ monthlyBudget: hh.monthlyBudget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export default { setUserRole, getHouseholdUsers };
