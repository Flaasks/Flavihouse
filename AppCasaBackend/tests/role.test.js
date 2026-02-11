import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import User from "../src/models/User.js";

let adminToken, memberToken, otherToken, memberId, otherId, householdId;

beforeEach(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const h = await Household.create({ name: 'RoleHouse' });
  householdId = h.id;

  // admin
  await request(app).post('/auth/register').send({ name: 'Admin', email: 'ra@h.com', password: 'pass', householdId: h.id });
  const admin = await User.findOne({ where: { email: 'ra@h.com' } });
  await admin.update({ role: 'admin' });
  const la = await request(app).post('/auth/login').send({ email: 'ra@h.com', password: 'pass' });
  adminToken = la.body.token;

  // member
  const r = await request(app).post('/auth/register').send({ name: 'Member', email: `rm+${Math.random().toString(36).slice(2)}@h.com`, password: 'pass', householdId: h.id });
  memberId = r.body.user.id;
  const lm = await request(app).post('/auth/login').send({ email: r.body.user.email, password: 'pass' });
  memberToken = lm.body.token;

  // other household
  const h2 = await Household.create({ name: 'Other' });
  await request(app).post('/auth/register').send({ name: 'Other', email: `o+${Math.random().toString(36).slice(2)}@h.com`, password: 'pass', householdId: h2.id });
  const lo = await request(app).post('/auth/login').send({ email: (await User.findOne({ where: { householdId: h2.id } })).email, password: 'pass' });
  otherToken = lo.body.token;
  const other = await User.findOne({ where: { householdId: h2.id } });
  otherId = other.id;
});

afterAll(async () => { await sequelize.close(); });

test('admin can promote member to admin', async () => {
  await request(app).post(`/admin/${householdId}/users/${memberId}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'admin' }).expect(200);
  const u = await User.findByPk(memberId);
  expect(u.role).toBe('admin');
});

test('non-admin cannot change role', async () => {
  await request(app).post(`/admin/${householdId}/users/${memberId}/role`).set('Authorization', `Bearer ${memberToken}`).send({ role: 'member' }).expect(403);
});

test('cannot change role of user in other household', async () => {
  await request(app).post(`/admin/${householdId}/users/${otherId}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'admin' }).expect(403);
});
