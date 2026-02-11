import { setSender, processReminderJob } from '../src/services/reminderWorker.js';
import Notification from '../src/models/Notification.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';
import { jest } from '@jest/globals';

let mockSender = { send: jest.fn() };

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  await sequelize.sync({ force: true });
  const hh = await Household.create({ name: 'BWHome', monthlyBudget: 1000 });
  // register users via API to ensure password hashing hooks run
  const req = (await import('supertest')).default;
  const app = (await import('../src/app.js')).default;
  await req(app).post('/auth/register').send({ name: 'BW1', email: 'bw1@h.com', password: 'p', householdId: hh.id });
  await req(app).post('/auth/register').send({ name: 'BW2', email: 'bw2@h.com', password: 'p', householdId: hh.id });
  // fetch users and create notifications for both
  const UserModel = (await import('../src/models/User.js')).default;
  const u1 = await UserModel.findOne({ where: { email: 'bw1@h.com' } });
  const u2 = await UserModel.findOne({ where: { email: 'bw2@h.com' } });
  await Notification.bulkCreate([
    { userId: u1.id, type: 'budget_threshold', payload: { householdId: hh.id, month: '2025-10' }, delivered: false },
    { userId: u2.id, type: 'budget_threshold', payload: { householdId: hh.id, month: '2025-10' }, delivered: false },
  ]);
  setSender(mockSender);
});

afterAll(async () => { await sequelize.close(); });

test('processor handles budget_alert job: sends emails and marks notifications delivered', async () => {
  const hh = await Household.findOne({ where: { name: 'BWHome' } });
  const users = await User.findAll({ where: { householdId: hh.id } });
  const payload = { type: 'budget_alert', householdId: hh.id, month: '2025-10', monthlyBudget: 1000, monthTotal: 750, users: users.map(u => ({ id: u.id, email: u.email })) };
  const res = await processReminderJob(payload);
  expect(res).toHaveProperty('type', 'budget_alert');
  // sender must have been called for both users
  expect(mockSender.send).toHaveBeenCalledTimes(2);
  const delivered = await Notification.findAll({ where: { type: 'budget_threshold' } });
  expect(delivered.every(n => n.delivered)).toBe(true);
});
