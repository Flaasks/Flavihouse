import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Expense from "./Expense.js";
import User from "./User.js";

const ExpenseShare = sequelize.define("ExpenseShare", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  expenseId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
});

export default ExpenseShare;

ExpenseShare.belongsTo(Expense, { foreignKey: 'expenseId' });
ExpenseShare.belongsTo(User, { foreignKey: 'userId' });
