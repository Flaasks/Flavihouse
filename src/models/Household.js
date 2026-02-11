import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Household = sequelize.define("Household", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // monthly budget in the household's currency
  monthlyBudget: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
    defaultValue: null,
  },
  // stores YYYY-MM of the month for which an alert has already been sent
  budgetAlertMonth: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Household;
