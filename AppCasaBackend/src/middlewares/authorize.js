import User from "../models/User.js";
import Task from "../models/Task.js";
import ShoppingItem from "../models/ShoppingItem.js";
import Reminder from "../models/Reminder.js";

// Helper: check if user (from req.user.id) is member of householdId
export const requireHouseholdMember = (getHouseholdId) => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const householdId = typeof getHouseholdId === 'function' ? await getHouseholdId(req) : getHouseholdId;
    if (!householdId) return res.status(400).json({ message: 'householdId missing' });
    const user = await User.findByPk(userId);
    if (!user || user.householdId !== parseInt(householdId, 10)) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

// require that the acting user is a member of the household of the provided userId in body
export const requireHouseholdMemberForUserId = () => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const targetUserId = req.body?.userId;
    if (!targetUserId) return res.status(400).json({ message: 'userId required' });
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
    const user = await User.findByPk(userId);
    if (!user || user.householdId !== targetUser.householdId) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const requireHouseholdAdmin = (getHouseholdId) => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const householdId = typeof getHouseholdId === 'function' ? await getHouseholdId(req) : getHouseholdId;
    if (!householdId) return res.status(400).json({ message: 'householdId missing' });
  const user = await User.findByPk(userId);
  if (!user || user.householdId !== parseInt(householdId, 10) || user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

// Helper: require that the acting user is either the assigned user of the resource or a household member
export const requireAssignedOrHouseholdMember = (resourceType) => async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let resource;
    if (resourceType === 'task') resource = await Task.findByPk(req.params.id);
    else if (resourceType === 'shopping') resource = await ShoppingItem.findByPk(req.params.id);
    else if (resourceType === 'reminder') resource = await Reminder.findByPk(req.params.id);

    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // if assignedTo matches user, allow
    if (resource.assignedTo && parseInt(resource.assignedTo, 10) === parseInt(userId, 10)) return next();

    // otherwise require household membership. Determine the householdId owning the resource.
    let resourceHouseholdId = null;
    if (resource.householdId) resourceHouseholdId = resource.householdId;
    else if (resource.userId) {
      const owner = await User.findByPk(resource.userId);
      resourceHouseholdId = owner ? owner.householdId : null;
    }
    const user = await User.findByPk(userId);
    if (!user || !resourceHouseholdId || user.householdId !== parseInt(resourceHouseholdId, 10)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export default { requireHouseholdMember, requireAssignedOrHouseholdMember, requireHouseholdMemberForUserId };
