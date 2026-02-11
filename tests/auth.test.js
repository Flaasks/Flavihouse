import request from "supertest";
import app from "../src/app.js";
import sequelize from "../src/config/db.js";

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Auth endpoints", () => {
  test("Register and login flow", async () => {
    const user = { email: "test@example.com", password: "password123", name: "Test User" };

    const resReg = await request(app).post("/auth/register").send(user).expect(201);
    expect(resReg.body).toHaveProperty("user");
    expect(resReg.body.user).toHaveProperty("id");

    const resLogin = await request(app).post("/auth/login").send({ email: user.email, password: user.password }).expect(200);
    expect(resLogin.body).toHaveProperty("token");
  });
});
