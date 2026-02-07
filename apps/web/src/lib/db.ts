import { env } from "cloudflare:workers";

import { db } from "@acme/db/client";

export const dbClient = () => db({
  url: env.TURSO_CONNECTION_URL,
  databaseAuthToken: env.TURSO_AUTH_TOKEN,
});
