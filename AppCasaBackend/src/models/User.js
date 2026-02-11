// src/models/User.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import bcrypt from "bcrypt";
import Household from "./Household.js";

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  householdId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('member','admin'),
    allowNull: false,
    defaultValue: 'member',
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// hash password prima del salvataggio
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(user.password_hash, salt);
});

// associations
User.belongsTo(Household, { foreignKey: 'householdId' });

export default User;
