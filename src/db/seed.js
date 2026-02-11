import sequelize from "../config/db.js";
import Household from "../models/Household.js";
import User from "../models/User.js";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';

dotenv.config();

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected for seeding");

    // ensure models are synced
    await sequelize.sync();

    // create household
    const [household] = await Household.findOrCreate({ where: { name: "Casa" } });

    // create users
  const hashed = await bcrypt.hash('CasaApp22', 10);
  const [flavio] = await User.findOrCreate({ where: { email: "flavio@example.com" }, defaults: { name: "flavio", password_hash: hashed, householdId: household.id } });
  const [flavia] = await User.findOrCreate({ where: { email: "flavia@example.com" }, defaults: { name: "flavia", password_hash: hashed, householdId: household.id } });

    console.log("Seed completed", { household: household.id, flavio: flavio.id, flavia: flavia.id });
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
};

seed();
