// npm run check-db: confirms the connection string in .env works, without changing anything.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "./db.js";

try {
  const connection = await connectDb();
  const collections = await connection.db.listCollections().toArray();
  console.log(`Connected. Database "${connection.db.databaseName}" has ${collections.length} collection(s).`);
} catch (error) {
  console.error("Could not connect:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
