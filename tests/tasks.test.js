import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import User from "../src/models/User.js";

let token;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const household = await Household.create({ name: "Casa Task" });
  await request(app).post("/auth/register").send({ email: "tasker@test.com", password: "pass123", name: "Tasker", householdId: household.id });
  const res = await request(app).post("/auth/login").send({ email: "tasker@test.com", password: "pass123" });
  token = res.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

test("Create, assign, complete and delete task", async () => {
  const createRes = await request(app).post("/tasks").set("Authorization", `Bearer ${token}`).send({ householdId: 1, title: "Fare la spesa" }).expect(201);
  const id = createRes.body.id;

  // assign
  const assignRes = await request(app).post(`/tasks/${id}/assign`).set("Authorization", `Bearer ${token}`).send({ assignedTo: null }).expect(200);
  expect(assignRes.body).toHaveProperty("id");

  // complete
  const compRes = await request(app).post(`/tasks/${id}/complete`).set("Authorization", `Bearer ${token}`).expect(200);
  expect(compRes.body.status).toBe('done');

  // delete
  // promote user to admin so delete is allowed under new policy
  await User.update({ role: 'admin' }, { where: { id: 1 } });
  await request(app).delete(`/tasks/${id}`).set("Authorization", `Bearer ${token}`).expect(200);
});
