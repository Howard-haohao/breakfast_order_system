import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

const trustedOrigins = [
  process.env.API_ALLOWED_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter((value): value is string => Boolean(value));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins,
  baseURL: process.env.BETTER_AUTH_URL,
});
