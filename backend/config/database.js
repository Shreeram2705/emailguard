import mongoose from 'mongoose';

let connectionPromise;

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 7000 })
      .then(() => {
        console.log('MongoDB connected');
        return mongoose.connection;
      })
      .catch(error => {
        // Clear the rejected promise so a later request can retry the connection.
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
