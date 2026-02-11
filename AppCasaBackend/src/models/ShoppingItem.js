import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Household from "./Household.js";
import User from "./User.js";

const ShoppingItem = sequelize.define("ShoppingItem", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  householdId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.STRING, allowNull: true },
  // optional estimated price for the item
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  checked: { type: DataTypes.BOOLEAN, defaultValue: false },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true },
});

export default ShoppingItem;

ShoppingItem.belongsTo(Household, { foreignKey: 'householdId' });
ShoppingItem.belongsTo(User, { foreignKey: 'assignedTo' });
