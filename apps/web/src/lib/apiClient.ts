import { createIsomorphicFn } from "@tanstack/react-start";

import app from "@acme/api";
import { createApiClient } from "@acme/api/client";

export const makeApiClient = createIsomorphicFn()
  .server(() =>
    createApiClient("http://localhost", {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        app.fetch(new Request(input, init)) as Promise<Response>,
    }),
  )
  .client(() => createApiClient(window.location.origin));
