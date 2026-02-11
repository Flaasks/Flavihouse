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
  const hh = await Household.create({ name: 'NotifHome' });
  householdId = hh.id;
  await request(app).post('/auth/register').send({ name: 'N1', email: 'n1@h.com', password: 'p', householdId });
  const r = await request(app).post('/auth/login').send({ email: 'n1@h.com', password: 'p' });
  token = r.body.token;
  const u = await User.findOne({ where: { email: 'n1@h.com' } });
  user = u;

  // create notifications
  await Notification.bulkCreate([
    { userId: user.id, type: 'budget_threshold', payload: { month: '2025-10' }, delivered: false },
    { userId: user.id, type: 'other', payload: {}, delivered: false },
  ]);
});

afterAll(async () => { await sequelize.close(); });

test('list notifications returns unread notifications', async () => {
  const res = await request(app).get(`/households/${householdId}/notifications?unread=true`).set('Authorization', `Bearer ${token}`).expect(200);
  expect(res.body.length).toBeGreaterThanOrEqual(2);
});

test('mark notification as read updates delivered flag', async () => {
  const nots = await Notification.findAll({ where: { userId: user.id } });
  const nid = nots[0].id;
  await request(app).post(`/notifications/${nid}/read`).set('Authorization', `Bearer ${token}`).expect(200);
  const n2 = await Notification.findByPk(nid);
  expect(n2.delivered).toBe(true);
});
