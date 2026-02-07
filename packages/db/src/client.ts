import { drizzle } from "drizzle-orm/libsql";

export const db = (options: { url: string; databaseAuthToken: string }) => {
  return drizzle({
    connection: {
      url: options.url,
      authToken: options.databaseAuthToken,
    },
  });
};

export type DbType = ReturnType<typeof db>;
