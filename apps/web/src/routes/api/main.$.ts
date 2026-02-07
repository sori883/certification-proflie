import { createFileRoute } from "@tanstack/react-router";

import app from "@acme/api";

export const Route = createFileRoute("/api/main/$")({
  server: {
    handlers: {
      GET: ({ request }) => app.fetch(request),
      POST: ({ request }) => app.fetch(request),
      PUT: ({ request }) => app.fetch(request),
      DELETE: ({ request }) => app.fetch(request),
    },
  },
});
