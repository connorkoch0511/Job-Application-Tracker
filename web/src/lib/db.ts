import { neon } from "@neondatabase/serverless";

// Neon serverless HTTP client — one round-trip per query, no pooling needed,
// which suits Vercel's serverless functions. Tagged-template usage
// parameterizes values safely: sql`select ... where id = ${id}`.
export const sql = neon(process.env.DATABASE_URL!);
