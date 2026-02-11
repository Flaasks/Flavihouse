// Small migration helper: adds `completed` boolean column to Reminders if missing
import sequelize from '../src/config/db.js';

const run = async () => {
  try {
    const qi = sequelize.getQueryInterface();
    console.log('Checking/adding column `completed` to Reminders...');
    // Define column attributes
    const col = {
      type: sequelize.constructor?.BOOLEAN || 'BOOLEAN',
      allowNull: false,
      defaultValue: false,
    };
    // Use addColumn; if column exists, this will throw — we catch and report
    try {
      await qi.addColumn('Reminders', 'completed', col);
      console.log('Column `completed` added to Reminders.');
    } catch (err) {
      // some dialects or sequelize versions throw when column exists
      const message = String(err && err.message).toLowerCase();
      if (message.includes('duplicate') || message.includes('already exists') || message.includes('column') && message.includes('exists')) {
        console.log('Column `completed` already exists.');
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('Failed to add column `completed` to Reminders:', err && err.message);
    process.exitCode = 2;
  } finally {
    try { await sequelize.close(); } catch(e){}
  }
};

run();
