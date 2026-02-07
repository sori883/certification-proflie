import { queryOptions } from "@tanstack/react-query";

import type { ApiClient } from "@acme/api/client";

export const helloQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: ["hello"],
    queryFn: async () => {
      const res = await api.api.main.$get();
      return res.text();
    },
  });
