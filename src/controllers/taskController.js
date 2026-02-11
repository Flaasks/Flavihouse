import Task from "../models/Task.js";
import User from "../models/User.js";

export const listTasks = async (req, res) => {
  try {
    const householdId = req.query.householdId || req.body.householdId || null;
    const tasks = await Task.findAll({ where: { householdId } });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { householdId, title, description, assignedTo, dueDate } = req.body;
    if (!householdId || !title) return res.status(400).json({ message: 'householdId and title required' });
    // Only admins can create tasks assigned to others. Members can create tasks but only for themselves.
    const actorId = req.user?.id;
    const actor = await User.findByPk(actorId);
    let ownerAssignedTo = assignedTo || null;
    if (ownerAssignedTo) {
      const target = await User.findByPk(ownerAssignedTo);
      if (!target || target.householdId !== parseInt(householdId, 10)) {
        return res.status(400).json({ message: 'assignedTo must belong to the household' });
      }
    }
    if (assignedTo && parseInt(assignedTo, 10) !== actorId) {
      if (!actor || actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can assign tasks to others' });
    }
    const task = await Task.create({ householdId, title, description: description || null, assignedTo: ownerAssignedTo, dueDate: dueDate || null, status: 'open' });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const assignTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task non trovato' });
    const actorId = req.user?.id;
    const actor = await User.findByPk(actorId);
    const newAssigned = req.body.assignedTo || null;
    if (newAssigned) {
      const target = await User.findByPk(newAssigned);
      if (!target || target.householdId !== task.householdId) {
        return res.status(400).json({ message: 'assignedTo must belong to the household' });
      }
    }
    // only admins can assign tasks to other users
    if (newAssigned && parseInt(newAssigned, 10) !== actorId) {
      if (!actor || actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can assign tasks to others' });
    }
    task.assignedTo = newAssigned;
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const completeTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task non trovato' });
    const actorId = req.user?.id;
    const actor = await User.findByPk(actorId);
    if (!actor || actor.householdId !== task.householdId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (task.assignedTo && parseInt(task.assignedTo, 10) !== parseInt(actorId, 10)) {
      if (actor.role !== 'admin') return res.status(403).json({ message: 'Only admin can complete tasks assigned to others' });
    }
    task.status = 'done';
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task non trovato' });
    await task.destroy();
    res.json({ message: 'Eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
};
