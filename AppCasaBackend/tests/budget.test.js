import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';
import Expense from '../src/models/Expense.js';
import Notification from '../src/models/Notification.js';

// We'll mock reminderQueue.enqueueReminder and reminderWorker.sendReminder
import reminderQueue from '../src/services/reminderQueue.js';
import * as reminderWorker from '../src/services/reminderWorker.js';
import { jest } from '@jest/globals';

let token, householdId, user;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const hh = await Household.create({ name: 'BudgetHome', monthlyBudget: 1000 });
  householdId = hh.id;
  // create two users
  await request(app).post('/auth/register').send({ name: 'U1', email: 'u1@h.com', password: 'p', householdId: hh.id });
  const r = await request(app).post('/auth/login').send({ email: 'u1@h.com', password: 'p' });
  token = r.body.token;
  const u = await User.findOne({ where: { email: 'u1@h.com' } });
  user = u;
  await request(app).post('/auth/register').send({ name: 'U2', email: 'u2@h.com', password: 'p', householdId: hh.id });
});

afterAll(async () => { await sequelize.close(); });

jest.spyOn(reminderQueue, 'enqueueReminder');
// Use setSender to inject a mock sender for inline fallback tests
const mockSender = { send: jest.fn() };
reminderWorker.setSender(mockSender);

afterEach(() => {
  jest.clearAllMocks();
});

test('crossing 70% enqueues a budget alert job and creates notifications', async () => {
  // seed expenses to reach 650 (65%)
  await Expense.create({ householdId, userId: user.id, category: 'food', amount: 650, date: '2025-10-01' });
  // now add an expense of 100 to cross 75%
  const res = await request(app).post('/expenses').set('Authorization', `Bearer ${token}`).send({ householdId, category: 'bills', amount: 100, date: '2025-10-02' }).expect(201);

  // Verify household updated budgetAlertMonth
  const hh = await Household.findByPk(householdId);
  const monthKey = '2025-10';
  expect(hh.budgetAlertMonth).toBe(monthKey);

  // verify notifications created for both users
  const nots = await Notification.findAll({ where: { type: 'budget_threshold' } });
  expect(nots.length).toBeGreaterThanOrEqual(2);

  // enqueueReminder should have been called with jobId budget-<household>-<month>
  expect(reminderQueue.enqueueReminder).toHaveBeenCalled();
  const calledWithJob = reminderQueue.enqueueReminder.mock.calls.find(c => c[1] && c[1].jobId && c[1].jobId.startsWith(`budget-${householdId}-`));
  expect(calledWithJob).toBeDefined();
});

test('enqueue failure falls back to inline sendReminder', async () => {
  // simulate queue being unavailable by making enqueueReminder return null
  reminderQueue.enqueueReminder.mockImplementationOnce(async () => null);
  // clear alert month so we can trigger again
  const hh = await Household.findByPk(householdId);
  hh.budgetAlertMonth = null;
  await hh.save();

  // seed small expense and then one to cross threshold
  await Expense.create({ householdId, userId: user.id, category: 'misc', amount: 650, date: '2025-11-01' });
  const r = await request(app).post('/expenses').set('Authorization', `Bearer ${token}`).send({ householdId, category: 'bills', amount: 100, date: '2025-11-02' }).expect(201);

  // when queue returns null, sendReminder should be invoked inline
  expect(mockSender.send).toHaveBeenCalled();
});
