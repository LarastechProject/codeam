import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createClient } from "@supabase/supabase-js";
import { getUserByOpenId, upsertUser } from "../db";

export function extractBearerToken(req: CreateExpressContextOptions["req"]) {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}
export function isTeacherEmail(email?: string | null) {
  if (!email) return false;
  const allowlist = (process.env.CODESPROUT_TEACHER_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

export function supabaseIdentityToInsert(identity: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  return { openId: identity.id, email: identity.email ?? null, name: (identity.user_metadata?.full_name as string | undefined) ?? identity.email ?? null, loginMethod: "supabase", ...(isTeacherEmail(identity.email) ? { role: "admin" as const } : {}) } as const;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = extractBearerToken(opts.req);
    if (token && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await supabase.auth.getUser(token);
      if (result.data.user) {
        const identity = result.data.user;
        await upsertUser(supabaseIdentityToInsert(identity));
        user = (await getUserByOpenId(identity.id)) ?? null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures; invalid tokens become anonymous.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
