import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy server/.env.example to server/.env and add your Atlas connection string.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  return mongoose.connection;
}

/** GridFS bucket for uploaded files (paper images and college logos). */
export function fileBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "files" });
}
