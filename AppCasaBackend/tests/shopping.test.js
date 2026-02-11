import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import User from "../src/models/User.js";

let token;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
  const household = await Household.create({ name: "Casa Shop" });
  await request(app).post("/auth/register").send({ email: "shopper@test.com", password: "pass123", name: "Shopper", householdId: household.id });
  const res = await request(app).post("/auth/login").send({ email: "shopper@test.com", password: "pass123" });
  token = res.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

test("Create, list, toggle and delete shopping item", async () => {
  // create item
  const createRes = await request(app).post("/shopping").set("Authorization", `Bearer ${token}`).send({ householdId: 1, name: "Pane", quantity: "1", amount: 2.5 }).expect(201);
  expect(createRes.body).toHaveProperty("id");
  const id = createRes.body.id;

  // list
  const listRes = await request(app).get("/shopping").set("Authorization", `Bearer ${token}`).query({ householdId: 1 }).expect(200);
  expect(Array.isArray(listRes.body)).toBe(true);

  // includeTotal should return estimatedTotal
  const totRes = await request(app).get("/shopping").set("Authorization", `Bearer ${token}`).query({ householdId: 1, includeTotal: 'true' }).expect(200);
  expect(totRes.body).toHaveProperty('estimatedTotal');

  // toggle
  const toggleRes = await request(app).post(`/shopping/${id}/toggle`).set("Authorization", `Bearer ${token}`).expect(200);
  // toggle should create an expense and return the created expense
  expect(toggleRes.body).toHaveProperty("createdExpense");
  const expense = toggleRes.body.createdExpense;
  expect(parseFloat(expense.amount)).toBeCloseTo(2.5, 2);

  // delete
  // promote to admin so delete is allowed
  await User.update({ role: 'admin' }, { where: { id: 1 } });
  // item should have been removed by toggle; attempt to delete should 404
  await request(app).delete(`/shopping/${id}`).set("Authorization", `Bearer ${token}`).expect(404);
});
