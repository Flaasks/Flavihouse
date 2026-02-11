import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';

let token, householdId, user;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const hh = await Household.create({ name: 'NotifAllHome' });
  householdId = hh.id;
  await request(app).post('/auth/register').send({ name: 'NA1', email: 'na1@h.com', password: 'p', householdId });
  const r = await request(app).post('/auth/login').send({ email: 'na1@h.com', password: 'p' });
  token = r.body.token;
  const u = await User.findOne({ where: { email: 'na1@h.com' } });
  user = u;

  // create multiple notifications
  await Notification.bulkCreate([
    { userId: user.id, type: 'budget_threshold', payload: { month: '2025-10' }, delivered: false },
    { userId: user.id, type: 'other', payload: {}, delivered: false },
    { userId: user.id, type: 'info', payload: {}, delivered: false },
  ]);
});

afterAll(async () => { await sequelize.close(); });

test('mark all notifications as read', async () => {
  await request(app).post('/notifications/read-all').set('Authorization', `Bearer ${token}`).expect(200);
  const nots = await Notification.findAll({ where: { userId: user.id } });
  expect(nots.every(n => n.delivered)).toBe(true);
});
