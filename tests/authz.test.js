import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";

let tokenA, tokenB, userAId, userBId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const h1 = await Household.create({ name: 'H1' });
  const h2 = await Household.create({ name: 'H2' });

  // create user A in household 1
  const r1 = await request(app).post('/auth/register').send({ email: 'a@a.com', password: 'pass', name: 'A', householdId: h1.id });
  userAId = r1.body.user.id;
  const l1 = await request(app).post('/auth/login').send({ email: 'a@a.com', password: 'pass' });
  tokenA = l1.body.token;

  // create user B in household 2
  const r2 = await request(app).post('/auth/register').send({ email: 'b@b.com', password: 'pass', name: 'B', householdId: h2.id });
  userBId = r2.body.user.id;
  const l2 = await request(app).post('/auth/login').send({ email: 'b@b.com', password: 'pass' });
  tokenB = l2.body.token;
});

afterAll(async () => { await sequelize.close(); });

test('non-member cannot create shopping item for other household', async () => {
  await request(app).post('/shopping').set('Authorization', `Bearer ${tokenB}`).send({ householdId: 1, name: 'X' }).expect(403);
});

test('non-assigned cannot complete task assigned to other user', async () => {
  // user A create task and assign to A
  const t = await request(app).post('/tasks').set('Authorization', `Bearer ${tokenA}`).send({ householdId: 1, title: 'T1' }).expect(201);
  const id = t.body.id;
  await request(app).post(`/tasks/${id}/assign`).set('Authorization', `Bearer ${tokenA}`).send({ assignedTo: userAId }).expect(200);

  // user B tries to complete -> should be forbidden (403)
  await request(app).post(`/tasks/${id}/complete`).set('Authorization', `Bearer ${tokenB}`).expect(403);
});

test('non-assigned cannot mark reminder done for other user', async () => {
  // create a reminder for userA
  const r = await request(app).post('/reminders').set('Authorization', `Bearer ${tokenA}`).send({ userId: userAId, title: 'R1', remindAt: new Date().toISOString() }).expect(201);
  const id = r.body.id;

  // userB cannot mark done
  await request(app).post(`/reminders/${id}/done`).set('Authorization', `Bearer ${tokenB}`).expect(403);
});
