import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";
import Household from "../src/models/Household.js";
import ExpenseShare from "../src/models/ExpenseShare.js";

let token;
let userId;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });

  // create household
  const household = await Household.create({ name: "Casa Test" });

  // create user via register endpoint to ensure controller behavior
  const reg = await request(app).post("/auth/register").send({ email: "owner@test.com", password: "pass123", name: "Owner", householdId: household.id });
  userId = reg.body.user.id;
  const resLogin = await request(app).post("/auth/login").send({ email: "owner@test.com", password: "pass123" });
  token = resLogin.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

test("Create expense with equal split creates shares", async () => {
  const expensePayload = {
    title: "Cena",
    amount: 90,
    householdId: 1,
    category: "food",
    splitType: "equal",
    participants: [userId],
  };

  const res = await request(app).post("/expenses").set("Authorization", `Bearer ${token}`).send(expensePayload).expect(201);
  expect(res.body).toHaveProperty("id");

  const expenseId = res.body.id;
  const shares = await ExpenseShare.findAll({ where: { expenseId } });
  expect(shares.length).toBeGreaterThanOrEqual(1);
  // sum of shares should equal amount
  const sum = shares.reduce((s, sh) => s + parseFloat(sh.amount), 0);
  expect(Math.abs(sum - expensePayload.amount)).toBeLessThan(0.01);
});

test("Create expense with percent split creates correct shares", async () => {
  const expensePayload = {
    title: "Spesa",
    amount: 100,
    householdId: 1,
    category: "groceries",
    splitType: "custom",
    splitMode: "percent",
    shares: [
      { userId, percent: 30 },
      { userId, percent: 70 },
    ],
  };

  const res = await request(app).post("/expenses").set("Authorization", `Bearer ${token}`).send(expensePayload).expect(201);
  const expenseId = res.body.id;

  const shares = await ExpenseShare.findAll({ where: { expenseId } });
  expect(shares.length).toBe(2);
  const amounts = shares.map(s => parseFloat(s.amount)).sort((a,b)=>a-b);
  expect(amounts[0]).toBeCloseTo(30, 2);
  expect(amounts[1]).toBeCloseTo(70, 2);
});

test("Create expense with weight split creates proportional shares", async () => {
  const expensePayload = {
    title: "Viaggio",
    amount: 120,
    householdId: 1,
    category: "travel",
    splitType: "custom",
    splitMode: "weight",
    shares: [
      { userId, weight: 1 },
      { userId, weight: 3 },
    ],
  };

  const res = await request(app).post("/expenses").set("Authorization", `Bearer ${token}`).send(expensePayload).expect(201);
  const expenseId = res.body.id;
  const shares = await ExpenseShare.findAll({ where: { expenseId } });
  expect(shares.length).toBe(2);
  const amounts = shares.map(s => parseFloat(s.amount)).sort((a,b)=>a-b);
  // weights 1 and 3 => amounts 30 and 90
  expect(amounts[0]).toBeCloseTo(30, 1);
  expect(amounts[1]).toBeCloseTo(90, 1);
});

test("Creating custom shares with wrong sum returns error", async () => {
  const expensePayload = {
    title: "Errore",
    amount: 100,
    householdId: 1,
    category: "misc",
    splitType: "custom",
    splitMode: "amount",
    shares: [
      { userId, amount: 30 },
      { userId, amount: 50 },
    ],
  };

  await request(app).post("/expenses").set("Authorization", `Bearer ${token}`).send(expensePayload).expect(400);
});

test("Split endpoint can update an existing expense to percent split", async () => {
  // create a base expense (equal split)
  const base = {
    title: "Base",
    amount: 200,
    householdId: 1,
    category: "other",
    splitType: "equal",
  };
  const r = await request(app).post("/expenses").set("Authorization", `Bearer ${token}`).send(base).expect(201);
  const expenseId = r.body.id;

  // apply percent split via split endpoint
  const splitPayload = {
    type: "custom",
    mode: "percent",
    shares: [
      { userId, percent: 40 },
      { userId, percent: 60 },
    ],
  };

  const res = await request(app).post(`/expenses/${expenseId}/split`).set("Authorization", `Bearer ${token}`).send(splitPayload).expect(200);
  expect(res.body).toHaveProperty("shares");
  const shares = res.body.shares;
  const sum = shares.reduce((s, sh) => s + parseFloat(sh.amount), 0);
  expect(Math.abs(sum - base.amount)).toBeLessThan(0.01);
});
