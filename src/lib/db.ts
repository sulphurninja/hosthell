import mongoose from "mongoose";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  const MONGOOSE_URL = process.env.MONGOOSE_URL;
  if (!MONGOOSE_URL) {
    throw new Error("MONGOOSE_URL environment variable is not defined");
  }

  cached.promise = mongoose.connect(MONGOOSE_URL, {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
