import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

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
    baseURL: process.env.BETTER_AUTH_URL,
    
    trustedOrigins: [
        "http://localhost:5173", // 👈 允許本地端 Vite 預設網址
        "http://localhost:5174", // 👈 (選填) 有時 Vite 會跑到 5174，順便加上策安全
        "https://breakfast-order-system-1.onrender.com" // 👈 允許雲端 Render 網址
    ] 
});