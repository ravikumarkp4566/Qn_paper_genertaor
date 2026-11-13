import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { api } from "./routes.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.");
  process.exit(1);
}

const app = express();
const origins = (process.env.CLIENT_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true }));
// LaTeX papers are text, but a long paper with many questions can pass 1 MB.
app.use(express.json({ limit: "4mb" }));
app.use("/api", api);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((error, req, res, next) => {
  if (error?.code === 11000) return res.status(409).json({ error: "That record already exists" });
  if (error?.name === "ValidationError" || error?.name === "CastError") return res.status(400).json({ error: error.message });
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Upload is too large" });
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const port = Number(process.env.PORT) || 5050;

connectDb()
  .then((connection) => {
    console.log(`MongoDB connected: database "${connection.db.databaseName}"`);
    app.listen(port, () => console.log(`QPGen API on http://localhost:${port}/api`));
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  });
