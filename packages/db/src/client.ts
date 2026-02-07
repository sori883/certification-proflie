import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";

export const createDbClient = (options: {
  url: string;
  databaseAuthToken: string;
}) => {
  const client = createClient({
    url: options.url,
    authToken: options.databaseAuthToken,
  });

  return drizzle({ client });
};

export type DbType = ReturnType<typeof createDbClient>;
