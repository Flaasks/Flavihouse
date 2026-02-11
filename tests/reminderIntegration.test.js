import request from 'supertest';
import app from '../src/app.js';
import sequelize from '../src/config/db.js';
import Household from '../src/models/Household.js';
import User from '../src/models/User.js';
import Reminder from '../src/models/Reminder.js';
import * as remWorker from '../src/services/reminderWorker.js';
import { jest } from '@jest/globals';

let token;

beforeEach(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
  process.env.REMINDER_BACKOFF_MS = '10';
  process.env.REMINDER_ATTEMPTS = '3';
  await sequelize.sync({ force: true });
  const household = await Household.create({ name: 'RemInt' });
  await request(app).post('/auth/register').send({ email: 'ri@test.com', password: 'pass', name: 'Ri', householdId: household.id });
  const res = await request(app).post('/auth/login').send({ email: 'ri@test.com', password: 'pass' });
  token = res.body.token;
});

afterEach(async () => { await sequelize.close(); jest.useRealTimers(); });

test('force-send retries and eventually marks reminder sent', async () => {
  // create reminder due now for user id 1
  const rem = await Reminder.create({ userId: 1, title: 'Test', remindAt: new Date(), sent: false });

  // mock sender to fail twice then succeed
  let call = 0;
  const mockSender = {
    send: jest.fn().mockImplementation(() => {
      call++;
      if (call < 3) return Promise.reject(new Error('fail'));
      return Promise.resolve();
    })
  };
  remWorker.setSender(mockSender);

  const p = await request(app).post('/reminders/force-send').set('Authorization', `Bearer ${token}`).send().expect(200);

  // allow short time for retries to complete in-process
  await new Promise((res) => setTimeout(res, 200));
  const r = await Reminder.findByPk(rem.id);
  expect(r.sent).toBe(true);
  // restore default sender to avoid affecting other tests
  remWorker.setSender({ send: async (rem) => { console.log('[reminderWorker] default send', rem.id); } });
});
