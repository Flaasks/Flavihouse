// src/config/db.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Use SQLite in-memory for tests to avoid requiring Postgres in CI/local tests.
let sequelize;
if (process.env.NODE_ENV === "test") {
  sequelize = new Sequelize("sqlite::memory:", { logging: false });
} else {
  // Allow either a full DATABASE_URL or individual connection params for non-test envs
  sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: "postgres",
        logging: false,
      })
    : new Sequelize(process.env.DB_NAME || "postgres", process.env.DB_USER || "postgres", process.env.DB_PASSWORD || "", {
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        dialect: "postgres",
        logging: false,
      });
}

export default sequelize;
