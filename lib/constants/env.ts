// Production environment constants
export const ENV = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fonana_dev?schema=public',
  NODE_ENV: process.env.NODE_ENV || 'production'
} 