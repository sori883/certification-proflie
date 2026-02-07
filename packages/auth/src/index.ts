import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { DbType } from "@acme/db/client";
import * as schema from "@acme/db/schema";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  db: DbType;
  authUrl: string;
  secret: string | undefined;
  trustedUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(options.db, {
      provider: "sqlite",
      schema,
    }),
    baseURL: options.authUrl,
    secret: options.secret,
    trustedOrigins: [options.trustedUrl],
    plugins: [...(options.extraPlugins ?? [])],
    advanced: {
      useSecureCookies: true,
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    socialProviders: {
      google: {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        redirectURI: `${options.authUrl}/api/auth/callback/google`,
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
