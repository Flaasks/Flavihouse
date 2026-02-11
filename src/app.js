import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import shoppingRoutes from "./routes/shoppingRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/shopping", shoppingRoutes);
app.use("/tasks", taskRoutes);
app.use("/reminders", reminderRoutes);
app.use("/admin", adminRoutes);
app.use("/analytics", analyticsRoutes);
app.use('/', notificationRoutes);

export default app;
