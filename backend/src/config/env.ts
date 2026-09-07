import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_for_dev_382947239487293847',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
};
