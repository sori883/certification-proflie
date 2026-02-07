import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

import { initAuth } from "@acme/auth";

import { dbClient } from "~/lib/dbClient";

export const auth = initAuth({
  db: dbClient(),
  authUrl: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedUrl: env.BETTER_TRUSTED_URL,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  extraPlugins: [tanstackStartCookies()],
});
