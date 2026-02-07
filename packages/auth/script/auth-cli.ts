import { db } from "@acme/db/client";

import { initAuth } from "../src";

export const auth = initAuth({
  db: db({
    url: process.env.TURSO_CONNECTION_URL!,
    databaseAuthToken: process.env.TURSO_AUTH_TOKEN!,
  }),
  authUrl: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedUrl: process.env.BETTER_TRUSTED_URL!,
  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});
