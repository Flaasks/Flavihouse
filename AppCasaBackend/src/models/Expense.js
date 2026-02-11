import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";
import Household from "./Household.js";

const Expense = sequelize.define("Expense", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  householdId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  splitType: { type: DataTypes.STRING, allowNull: true },
});

export default Expense;

// associations
Expense.belongsTo(User, { foreignKey: 'userId' });
Expense.belongsTo(Household, { foreignKey: 'householdId' });
