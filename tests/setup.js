import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";

import sequelize from "../src/config/db.js";

// import models so they register with sequelize
import "../src/models/User.js";
import "../src/models/Household.js";
import "../src/models/Expense.js";
import "../src/models/ExpenseShare.js";
import "../src/models/ShoppingItem.js";
import "../src/models/Task.js";
import "../src/models/Reminder.js";
import "../src/models/Notification.js";

export default async function globalSetup() {
  // sync all models to in-memory sqlite
  await sequelize.sync({ force: true });
}
