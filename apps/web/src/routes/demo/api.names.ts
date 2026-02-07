import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/demo/api/names")({
  server: {
    handlers: {
      GET: () => {
        console.log("SERVER_TEST:", env.SERVER_TEST);
        return json(["Alice", "Bob", "Charlie"]);
      },
    },
  },
});
