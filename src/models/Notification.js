import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";

const Notification = sequelize.define("Notification", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  payload: { type: DataTypes.JSON, allowNull: true },
  delivered: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default Notification;

Notification.belongsTo(User, { foreignKey: 'userId' });
