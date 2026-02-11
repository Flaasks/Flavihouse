import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import Expense from '../src/models/Expense.js';

let token, householdId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const h = await Household.create({ name: 'RangesHome' });
  householdId = h.id;
  await request(app).post('/auth/register').send({ name: 'R', email: 'r@h.com', password: 'p', householdId: h.id });
  const r = await request(app).post('/auth/login').send({ email: 'r@h.com', password: 'p' });
  token = r.body.token;

  // create expenses across several months
  await Expense.bulkCreate([
    // assume today is 2025-09-15 for deterministic tests; we will set explicit dates
    { householdId: h.id, userId: 1, category: 'food', amount: 100, date: '2025-09-01' }, // current month
    { householdId: h.id, userId: 1, category: 'food', amount: 50, date: '2025-09-10' },
    { householdId: h.id, userId: 1, category: 'transport', amount: 30, date: '2025-08-20' }, // previous month
    { householdId: h.id, userId: 1, category: 'bills', amount: 200, date: '2025-06-15' }, // 3 months ago
    { householdId: h.id, userId: 1, category: 'bills', amount: 150, date: '2025-05-05' }, // 4 months ago
  ]);
});

afterAll(async () => { await sequelize.close(); });

test('current_month range returns only current month totals', async () => {
  const res = await request(app)
    .get(`/analytics/households/${householdId}/expenses/summary?range=current_month&asOf=2025-09-15`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const { total, monthlyAverage, byCategory, byMonth } = res.body;
  // total in Sept 2025: 150
  expect(parseFloat(total)).toBeCloseTo(150, 2);
  // monthlyAverage for single month should equal total
  expect(parseFloat(monthlyAverage)).toBeCloseTo(150, 2);
  expect(byMonth.length).toBeGreaterThanOrEqual(1);
});

test('previous_month range returns previous month totals', async () => {
  const res = await request(app)
    .get(`/analytics/households/${householdId}/expenses/summary?range=previous_month&asOf=2025-09-15`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const { total, byCategory, byMonth } = res.body;
  // previous month (Aug 2025) total = 30
  expect(parseFloat(total)).toBeCloseTo(30, 2);
  const transport = byCategory.find(b => b.category === 'transport');
  expect(parseFloat(transport.total)).toBeCloseTo(30, 2);
});

test('last_6_months returns multi-month totals and average', async () => {
  const res = await request(app)
    .get(`/analytics/households/${householdId}/expenses/summary?range=last_6_months&asOf=2025-09-15`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  const { total, monthlyAverage, byMonth } = res.body;
  // total of all seeded expenses = 100+50+30+200+150 = 530
  expect(parseFloat(total)).toBeCloseTo(530, 2);
  // months covered from Apr? to Sep => ensure monthlyAverage is positive
  expect(parseFloat(monthlyAverage)).toBeGreaterThan(0);
  expect(byMonth.length).toBeGreaterThanOrEqual(3);
});
