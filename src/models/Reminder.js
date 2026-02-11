import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";

const Reminder = sequelize.define("Reminder", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  shared: { type: DataTypes.BOOLEAN, defaultValue: false },
  remindAt: { type: DataTypes.DATE, allowNull: false },
  repeat: { type: DataTypes.STRING, allowNull: true },
  sent: { type: DataTypes.BOOLEAN, defaultValue: false },
  preNotified: { type: DataTypes.BOOLEAN, defaultValue: false },
  finalNotified: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default Reminder;

Reminder.belongsTo(User, { foreignKey: 'userId' });
