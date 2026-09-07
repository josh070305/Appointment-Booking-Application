import mongoose from 'mongoose';
import { ENV } from './env.js';

let mongoMemoryServer: any = null;

export async function connectDB(): Promise<typeof mongoose> {
  try {
    let uri = ENV.MONGO_URI;

    if (!uri) {
      console.log('⚡ No MONGO_URI provided in environment. Initializing MongoMemoryServer for embedded in-memory database...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log(`✅ In-memory MongoDB initialized at: ${uri}`);
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully.');
    return mongoose;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error('Error disconnecting database:', error);
  }
}
