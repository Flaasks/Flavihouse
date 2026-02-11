import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';
import Expense from '../src/models/Expense.js';

let token, householdId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const h = await Household.create({ name: 'AnalyticsHome' });
  householdId = h.id;
  await request(app).post('/auth/register').send({ name: 'A', email: 'a@h.com', password: 'p', householdId: h.id });
  const r = await request(app).post('/auth/login').send({ email: 'a@h.com', password: 'p' });
  token = r.body.token;

  // create expenses
  await Expense.bulkCreate([
    { householdId: h.id, userId: 1, category: 'food', amount: 10.5, date: '2025-08-10' },
    { householdId: h.id, userId: 1, category: 'food', amount: 5.25, date: '2025-08-15' },
    { householdId: h.id, userId: 1, category: 'transport', amount: 12.00, date: '2025-09-01' },
    { householdId: h.id, userId: 1, category: 'food', amount: 7.25, date: '2025-09-05' },
  ]);
});

afterAll(async () => { await sequelize.close(); });

test('expense summary returns totals by category and month', async () => {
  const res = await request(app).get(`/analytics/households/${householdId}/expenses/summary`).set('Authorization', `Bearer ${token}`).expect(200);
  const { byCategory, byMonth } = res.body;
  // category totals: food = 10.5+5.25+7.25 = 23.0, transport=12
  const food = byCategory.find(b => b.category === 'food');
  const transport = byCategory.find(b => b.category === 'transport');
  expect(parseFloat(food.total)).toBeCloseTo(23.0, 2);
  expect(parseFloat(transport.total)).toBeCloseTo(12.0, 2);

  // months: 2025-08 sum = 15.75, 2025-09 sum = 19.25
  const m8 = byMonth.find(m => m.month === '2025-08');
  const m9 = byMonth.find(m => m.month === '2025-09');
  expect(parseFloat(m8.total)).toBeCloseTo(15.75, 2);
  expect(parseFloat(m9.total)).toBeCloseTo(19.25, 2);
});
