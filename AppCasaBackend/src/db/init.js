import dotenv from "dotenv";
import sequelize from "../config/db.js";

// import models so sequelize knows about them
import "../models/User.js";
import "../models/Household.js";
import "../models/Expense.js";
import "../models/ExpenseShare.js";
import "../models/ShoppingItem.js";
import "../models/Task.js";
import "../models/Reminder.js";
import "../models/Notification.js";

dotenv.config();

const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("Sequelize authenticated successfully");

  // sync all models
  // By default we use safe sync (no alter) when the server starts to avoid
  // performing potentially destructive ALTERs automatically. Use DB_SYNC_MODE=alter
  // when you explicitly want sequelize to alter tables (for local development).
  const syncMode = process.env.DB_SYNC_MODE === 'alter' ? { alter: true } : {};
    // If the DB already contains tables, avoid running sync automatically to
    // prevent Sequelize from attempting to recreate sequences/types which can
    // lead to duplicate-object errors in databases with prior partial state.
    const forceSync = process.env.DB_FORCE_SYNC === 'true';
    if (forceSync) {
      await sequelize.sync(syncMode);
    } else {
      // check if there are any user tables in public schema
      const [results] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' LIMIT 1;");
      if (!results || results.length === 0) {
        await sequelize.sync(syncMode);
      } else {
        console.log('Detected existing tables, skipping automatic sequelize.sync() (set DB_FORCE_SYNC=true to force).');
      }
    }
    console.log("All models were synchronized successfully");
  } catch (err) {
    // print detailed error to help debugging
    console.error("Error creating/synchronizing tables:", err);
    if (err.parent) console.error("Parent error:", err.parent);
    process.exit(1);
  }
};

// If this file is run directly (node src/db/init.js), initialize DB
if (import.meta.url === `file://${process.cwd()}/src/db/init.js`) {
  initDb();
}

export default initDb;
