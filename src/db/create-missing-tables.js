import sequelize from "../config/db.js";
import "../models/User.js";
import "../models/Household.js";
import "../models/Expense.js";
import "../models/ExpenseShare.js";
import "../models/ShoppingItem.js";
import "../models/Task.js";
import "../models/Reminder.js";
import "../models/Notification.js";

const models = [
  sequelize.models.User,
  sequelize.models.Household,
  sequelize.models.Expense,
  sequelize.models.ExpenseShare,
  sequelize.models.ShoppingItem,
  sequelize.models.Task,
  sequelize.models.Reminder,
  sequelize.models.Notification,
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const [rows] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    const existing = new Set(rows.map(r => r.table_name));

    for (const model of models) {
      const tableName = typeof model.getTableName === 'function' ? model.getTableName() : model.tableName;
      if (!existing.has(tableName)) {
        console.log(`Creating missing table: ${tableName}`);
        await model.sync();
        console.log(`Created ${tableName}`);
      } else {
        console.log(`Table exists: ${tableName}`);
      }
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
