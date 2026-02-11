import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import User from "../src/models/User.js";

let token;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const household = await Household.create({ name: "Casa Rem" });
  await request(app).post("/auth/register").send({ email: "reminder@test.com", password: "pass123", name: "Rem", householdId: household.id });
  const res = await request(app).post("/auth/login").send({ email: "reminder@test.com", password: "pass123" });
  token = res.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

test("Create, list, mark done and delete reminder", async () => {
  const createRes = await request(app).post("/reminders").set("Authorization", `Bearer ${token}`).send({ userId: 1, title: "Ricordami", remindAt: new Date().toISOString() }).expect(201);
  const id = createRes.body.id;

  const listRes = await request(app).get("/reminders").set("Authorization", `Bearer ${token}`).expect(200);
  expect(listRes.body).toHaveProperty('active');
  expect(Array.isArray(listRes.body.active)).toBe(true);

  const doneRes = await request(app).post(`/reminders/${id}/done`).set("Authorization", `Bearer ${token}`).expect(200);
  expect(doneRes.body.sent).toBe(true);

  // promote user to admin so delete passes under new policy
  await User.update({ role: 'admin' }, { where: { id: 1 } });
  await request(app).delete(`/reminders/${id}`).set("Authorization", `Bearer ${token}`).expect(200);
});
