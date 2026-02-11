import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import User from "../src/models/User.js";

let adminToken, memberToken, memberId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const h = await Household.create({ name: 'AdminHouse' });

  // create admin user via register then elevate role directly (test only)
  await request(app).post('/auth/register').send({ name: 'Admin', email: 'admin@h.com', password: 'pass', householdId: h.id });
  const a = await User.findOne({ where: { email: 'admin@h.com' } });
  await a.update({ role: 'admin' });
  const la = await request(app).post('/auth/login').send({ email: 'admin@h.com', password: 'pass' });
  adminToken = la.body.token;

  // create member via register
  const r = await request(app).post('/auth/register').send({ name: 'Member', email: 'member@h.com', password: 'pass', householdId: h.id });
  memberId = r.body.user.id;
  const lm = await request(app).post('/auth/login').send({ email: 'member@h.com', password: 'pass' });
  memberToken = lm.body.token;
});

afterAll(async () => { await sequelize.close(); });

test('admin can delete shopping item but member cannot', async () => {
  // member creates item
  const cr = await request(app).post('/shopping').set('Authorization', `Bearer ${memberToken}`).send({ householdId: 1, name: 'X' }).expect(201);
  const id = cr.body.id;

  // member trying to delete should get 403
  await request(app).delete(`/shopping/${id}`).set('Authorization', `Bearer ${memberToken}`).expect(403);

  // admin can delete
  await request(app).delete(`/shopping/${id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
});
