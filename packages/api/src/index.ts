import { Hono } from "hono";

const app = new Hono().basePath("/api/main");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const route = app.get("/", (c) => {
  return c.text("Hello Hono!の動作確認");
});

export type AppType = typeof route;
export default app;
