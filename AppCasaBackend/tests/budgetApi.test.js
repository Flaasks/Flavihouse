import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';

let adminToken, memberToken, householdId, adminUser, memberUser;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const hh = await Household.create({ name: 'BudgetApiHome' });
  householdId = hh.id;
  // register admin and member
  await request(app).post('/auth/register').send({ name: 'Admin', email: 'admin@h.com', password: 'p', householdId });
  await request(app).post('/auth/register').send({ name: 'Member', email: 'member@h.com', password: 'p', householdId });
  adminUser = await User.findOne({ where: { email: 'admin@h.com' } });
  memberUser = await User.findOne({ where: { email: 'member@h.com' } });
  // make adminUser an admin
  await adminUser.update({ role: 'admin' });

  const a = await request(app).post('/auth/login').send({ email: 'admin@h.com', password: 'p' });
  adminToken = a.body.token;
  const m = await request(app).post('/auth/login').send({ email: 'member@h.com', password: 'p' });
  memberToken = m.body.token;
});

afterAll(async () => { await sequelize.close(); });

test('member can GET household budget (null initially)', async () => {
  const res = await request(app).get(`/admin/${householdId}/budget`).set('Authorization', `Bearer ${memberToken}`).expect(200);
  expect(res.body).toHaveProperty('monthlyBudget');
});

test('admin can set household monthlyBudget', async () => {
  const res = await request(app).put(`/admin/${householdId}/budget`).set('Authorization', `Bearer ${adminToken}`).send({ monthlyBudget: 1500 }).expect(200);
  expect(parseFloat(res.body.monthlyBudget)).toBeCloseTo(1500, 2);
});
