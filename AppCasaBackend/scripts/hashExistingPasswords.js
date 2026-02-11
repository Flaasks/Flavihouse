// Scan users with plaintext-like passwords and hash them
import sequelize from '../src/config/db.js';
import User from '../src/models/User.js';
import bcrypt from 'bcrypt';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const users = await User.findAll();
    for (const u of users) {
      const ph = u.password_hash || '';
      // crude heuristic: if password_hash length < 60 assume plaintext (bcrypt >= 60)
      if (ph && ph.length < 60) {
        const hashed = await bcrypt.hash(ph, 10);
        u.password_hash = hashed;
        await u.save();
        console.log('Hashed password for', u.email);
      }
    }
    console.log('Done');
  } catch (err) {
    console.error(err && err.message);
    process.exitCode = 2;
  } finally {
    try { await sequelize.close(); } catch(e){}
  }
};

run();
