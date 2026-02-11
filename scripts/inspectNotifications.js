import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/db.js';
import Reminder from '../src/models/Reminder.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';

(async function(){
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const reminders = await Reminder.findAll({ order: [['remindAt','ASC']], limit: 20 });
    console.log('\nRecent reminders:');
    reminders.forEach(r => {
      console.log(r.id, r.title, 'userId=', r.userId, 'remindAt=', r.remindAt, 'preNotified=', r.preNotified, 'finalNotified=', r.finalNotified, 'sent=', r.sent);
    });

    const nots = await Notification.findAll({ order: [['createdAt','DESC']], limit: 50 });
    console.log('\nRecent notifications:');
    nots.forEach(n => {
      console.log(n.id, 'userId=', n.userId, 'type=', n.type, 'delivered=', n.delivered, 'payload=', JSON.stringify(n.payload));
    });

    const users = await User.findAll({ attributes: ['id','name','email','householdId'] });
    console.log('\nUsers:');
    users.forEach(u=>console.log(u.id, u.name, u.email, u.householdId));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
