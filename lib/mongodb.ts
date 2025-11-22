import mongoose, { Mongoose } from 'mongoose';

/**
 * Strongly-typed shape of our cached Mongoose connection.
 *
 * `conn` holds the resolved Mongoose instance.
 * `promise` holds the in-flight connection promise while connecting.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Extend the global type definition to include a `mongoose` property.
 *
 * Next.js (and Node.js in general) keeps `globalThis` between hot reloads
 * in development. By attaching the connection to `globalThis`, we avoid
 * opening a new connection on every reload or API invocation.
 */
declare global {
  // eslint-disable-next-line no-var
  // `var` is required here so the declaration merges with the Node.js global.
  var mongoose: MongooseCache | undefined;
}

/**
 * The MongoDB connection string.
 *
 * Make sure to define this in your environment, for example:
 * - `.env.local` for local development
 *
 *   MONGODB_URI="your-connection-string"
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast at startup if the connection string is missing.
  throw new Error('Please define the MONGODB_URI environment variable.');
}

/**
 * Reuse the cached connection if it exists, otherwise create and store it.
 */
const cached: MongooseCache = globalThis.mongoose ?? {
  conn: null,
  promise: null,
};

// Ensure the global cache is always initialized.
globalThis.mongoose = cached;

/**
 * Establishes (or reuses) a single Mongoose connection to MongoDB.
 *
 * This helper is safe to use across API routes, server components,
 * and server actions in a Next.js (Node.js runtime) application.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // If we already have an active connection, return it immediately.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is already in progress, reuse the in-flight promise.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Disable mongoose's internal command buffering. This ensures
      // operations fail fast if the connection is not ready.
      bufferCommands: false,
    });
  }

  // Wait for the initial connection and cache the resolved instance.
  cached.conn = await cached.promise;
  return cached.conn;
}

export type { Mongoose as MongooseConnection };
