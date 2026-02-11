import sequelize from '../src/config/db.js';
import User from '../src/models/User.js';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const count = await User.count();
    console.log('Users count:', count);
    const users = await User.findAll({ limit: 10, attributes: ['id','name','email','householdId','role','createdAt'] });
    console.log('Sample users:');
    users.forEach(u=>console.log(u.toJSON()));
  } catch (err) {
    console.error('Error checking users:', err && err.message);
    process.exitCode = 2;
  } finally {
    try { await sequelize.close(); } catch(e){}
  }
};

run();
