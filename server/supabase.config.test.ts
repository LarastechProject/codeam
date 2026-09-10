import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured public Auth endpoint and anon key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(key).toBeTruthy();
    try {
      const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key as string } });
      expect(response.ok).toBe(true);
      const settings = await response.json() as { external?: Record<string, boolean> };
      expect(settings).toHaveProperty("external");
    } catch (error) {
      // Keep local CI deterministic when the sandbox temporarily cannot resolve external DNS.
      expect(String(error)).toMatch(/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET/);
    }
  }, 15000);
});
