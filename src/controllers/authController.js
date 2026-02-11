// src/controllers/authController.js
import User from "../models/User.js";
import Household from "../models/Household.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import authMiddleware from "../middlewares/authMiddleware.js";

dotenv.config();

export const register = async (req, res) => {
  try {
  const { name, email, password, householdId, householdName } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ message: "Email già registrata" });

    let finalHouseholdId = null;
    let role = 'member';

    if (householdId) {
      // validate provided household exists
      const hh = await Household.findByPk(householdId);
      if (!hh) return res.status(400).json({ message: 'householdId non valida' });
      finalHouseholdId = hh.id;
    } else if (householdName) {
      // create new household and make user admin
      const hh = await Household.create({ name: householdName });
      finalHouseholdId = hh.id;
      role = 'admin';
    }

    const newUser = await User.create({
      name,
      email,
      password_hash: password,
      householdId: finalHouseholdId,
      role,
    });

    // generate token so frontend can log in immediately
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ message: "Registrazione completata", token, user: { id: newUser.id, name, email, householdId: finalHouseholdId, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore del server" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(404).json({ message: "Utente non trovato" });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
      return res.status(401).json({ message: "Password errata" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login effettuato", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore del server" });
  }
};

export const me = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Non autorizzato' });
    const user = await User.findByPk(userId, { attributes: ['id','name','email','householdId','role'] });
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore del server' });
  }
}
