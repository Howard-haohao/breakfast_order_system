import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { allowedOrigins, authBaseUrl, useSecureCookies } from "./runtime";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", 
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
        }
    },
    baseURL: authBaseUrl,
    trustedOrigins: allowedOrigins,
    advanced: {
        defaultCookieAttributes: {
            sameSite: useSecureCookies ? "none" : "lax",
            secure: useSecureCookies
        }
    }
});
