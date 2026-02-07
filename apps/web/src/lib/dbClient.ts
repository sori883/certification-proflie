import { env } from "cloudflare:workers";

import { createDbClient } from "@acme/db/client";

export const dbClient = () =>
  createDbClient({
    url: env.TURSO_CONNECTION_URL,
    databaseAuthToken: env.TURSO_AUTH_TOKEN,
  });
