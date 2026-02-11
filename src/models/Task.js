import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Household from "./Household.js";
import User from "./User.js";

const Task = sequelize.define("Task", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  householdId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "open" },
  dueDate: { type: DataTypes.DATE, allowNull: true },
});

export default Task;

Task.belongsTo(Household, { foreignKey: 'householdId' });
Task.belongsTo(User, { foreignKey: 'assignedTo' });
