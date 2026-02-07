# Hono RPC + React Query SSR アーキテクチャ解説

## 全体像

このプロジェクトでは、Hono RPCとReact Queryを組み合わせて、型安全なAPIコールとSSR(サーバーサイドレンダリング)のデータプリフェッチを実現している。
t3-turboがtRPCで行っていることを、Hono RPCで再現した構成。

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (TanStack Start / Cloudflare Workers)         │
│                                                         │
│  ┌─ サーバー側 ──────────────────────────────────────┐  │
│  │                                                    │  │
│  │  routes/api/main.$.ts  ← 外部HTTPリクエストの入口  │  │
│  │       ↓                                            │  │
│  │  app.fetch(request)  ← Honoアプリを直接実行        │  │
│  │                                                    │  │
│  │  loader (SSR)                                      │  │
│  │       ↓                                            │  │
│  │  app.fetch(new Request(...))  ← HTTPなしで直接実行 │  │
│  │       ↓                                            │  │
│  │  QueryClientのキャッシュに格納                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ クライアント側 ──────────────────────────────────┐  │
│  │                                                    │  │
│  │  useSuspenseQuery                                  │  │
│  │       ↓                                            │  │
│  │  初回: キャッシュから取得 (SSRのデータを再利用)     │  │
│  │  再取得: HTTP → /api/main/* → Honoハンドラ         │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│  packages/api (@acme/api)           │
│                                     │
│  src/index.ts   ← Honoアプリ本体    │
│  src/client.ts  ← 型安全なクライアント│
│                                     │
│  ※ 独立サーバーではない              │
│  ※ webにインポートされて             │
│    同じプロセス内で動作する           │
└─────────────────────────────────────┘
```

---

## ファイル構成と役割

### 1. packages/api/src/index.ts — Honoアプリ本体

APIのルート定義を行う。`basePath("/api/main")` により、全ルートが `/api/main` 配下になる。

```ts
import { Hono } from "hono";

const app = new Hono().basePath("/api/main");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const route = app.get("/", (c) => {
  return c.text("Hello Hono!の動作確認");
});

export type AppType = typeof route;
export default app;
```

**ポイント:**
- `const route = app.get(...)` のように変数に代入することで、`typeof route` からルートの型情報（パス、レスポンス型など）をTypeScriptが推論できる
- `AppType` をエクスポートすることで、クライアント側が型安全にAPIを呼べる
- `app` はdefaultエクスポートされ、web側でHTTPハンドラとして使われる

---

### 2. packages/api/src/client.ts — 型安全なクライアントファクトリ

Honoの `hc`（HTTP Client）をラップし、`AppType` を使って型安全なクライアントを生成する。

```ts
import { hc } from "hono/client";

import type { AppType } from "./index.js";

export const createApiClient = (
  baseUrl: string,
  options?: Parameters<typeof hc<AppType>>[1],
) => hc<AppType>(baseUrl, options);

export type ApiClient = ReturnType<typeof createApiClient>;
```

**ポイント:**
- `hc<AppType>` により、クライアントが `AppType` のルート定義を型として認識する
- `options` を受け取ることで、サーバー側で `fetch` をカスタム（後述）できる
- `ApiClient` 型をエクスポートし、他ファイル（`__root.tsx`等）で型として使える

---

### 3. packages/api/package.json — エクスポート設定

`@acme/api`（Honoアプリ本体）と `@acme/api/client`（クライアント）を別々にインポートできるようにする。

```json
{
  "exports": {
    ".": {
      "default": "./src/index.ts"
    },
    "./client": {
      "default": "./src/client.ts"
    }
  }
}
```

**使い分け:**
- `import app from "@acme/api"` → Honoアプリ本体（サーバー側でのみ使用）
- `import { createApiClient } from "@acme/api/client"` → 型安全クライアント（サーバー/クライアント両方で使用）
- `import type { ApiClient } from "@acme/api/client"` → 型のみ（`__root.tsx`で使用）

---

### 4. apps/web/src/routes/api/main.$.ts — 外部HTTPリクエストの入口

TanStack Startのファイルベースルーティングで、`/api/main/*` へのHTTPリクエストをHonoに委譲する。

```ts
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
```

**ポイント:**
- `$` はTanStack Routerのスプラット（catch-all）記法。`/api/main/` 以下の全パスをキャッチする
- `server.handlers` はサーバー側でのみ実行される。これはページルートではなくAPIルート
- `app.fetch(request)` はHonoの標準的なリクエスト処理。Web標準の `Request` を受け取り `Response` を返す
- **このファイルはクライアントからHTTPでAPIを叩いた時の入口**。SSRのloaderからは使われない

---

### 5. apps/web/src/lib/apiClient.ts — サーバー/クライアント自動切り替え

`createIsomorphicFn` を使い、実行環境（サーバー or ブラウザ）に応じて異なるクライアントを返す。
**これがHTTPオーバーヘッドを排除する仕組みの核心。**

```ts
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
```

**サーバー側（SSR時）の動作:**
- `fetch` オプションにカスタム関数を渡す
- この関数は `hc` が内部で `fetch(url, requestInit)` を呼ぶ代わりに使われる
- `new Request(input, init)` でRequestオブジェクトを組み立て、`app.fetch()` に渡す
- `app.fetch()` はHonoアプリの関数呼び出し。**HTTPリクエストは発生しない**
- `"http://localhost"` はURLのベースとして必要だが、実際にHTTP通信はしない

**クライアント側（ブラウザ）の動作:**
- `window.location.origin`（例: `http://localhost:3000`）を使って通常のHTTPリクエストを行う
- このリクエストは `main.$.ts` のハンドラが受け取り、Honoに渡される

**なぜこの分岐が必要か:**
- SSRのloaderはサーバー上で実行される。同じサーバー内のHonoに対してHTTPリクエストを送るのは無駄（自分に対してネットワーク通信する）
- サーバー側では `app.fetch()` を直接呼ぶことで、HTTPの往復を省略する
- クライアント側は別プロセスなので、通常のHTTPが必要

---

### 6. apps/web/src/router.tsx — アプリ全体の設定

QueryClient（React Queryのキャッシュ管理）、APIクライアント、SSR統合を設定する。

```ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { makeApiClient } from "./lib/apiClient";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();
  const api = makeApiClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, api },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
```

**各部分の役割:**

- `new QueryClient()` — React Queryのキャッシュを作成。全てのAPIレスポンスはここに保存される
- `makeApiClient()` — 上述のIsomorphicクライアント。サーバー/クライアントで自動的に適切な実装が選ばれる
- `context: { queryClient, api }` — 全ルートの `loader` や `useRouteContext()` からアクセスできる共有データ
- `Wrap` — アプリ全体を `QueryClientProvider` で囲む。これがないとReact Queryのフックが使えない
- `setupRouterSsrQueryIntegration` — SSR時にサーバーのQueryClientキャッシュをHTMLに埋め込み（dehydrate）、クライアントで復元（hydrate）する仕組みを有効化する

---

### 7. apps/web/src/routes/__root.tsx — ルートの型定義

全ルートが共有するcontextの型を定義する。

```ts
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@acme/api/client";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  api: ApiClient;
}>()({
  // head, shellComponent は省略
});
```

**ポイント:**
- `createRootRouteWithContext<{ queryClient: QueryClient; api: ApiClient }>()` により、全子ルートの `loader` で `context.queryClient` と `context.api` が型安全に使えるようになる
- この型定義は `router.tsx` の `context: { queryClient, api }` と対応している

---

### 8. apps/web/src/routes/index.tsx — 実際の使い方

SSR prefetch + クライアント表示の完全な例。

```ts
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["hello"],
      queryFn: async () => {
        const res = await context.api.api.main.$get();
        return res.text();
      },
    });
  },
  component: App,
});

function App() {
  const { api } = Route.useRouteContext();
  const { data: hello } = useSuspenseQuery({
    queryKey: ["hello"],
    queryFn: async () => {
      const res = await api.api.main.$get();
      return res.text();
    },
  });

  return <span>{hello}</span>;
}
```

**loader（サーバー側で実行）:**
- `context.queryClient.prefetchQuery` でデータを事前取得し、キャッシュに格納する
- `context.api.api.main.$get()` はIsomorphicクライアントのサーバー版 → `app.fetch()` 直接呼び出し（HTTPなし）
- `void` を付けているのは、prefetchの完了を待たずに次へ進むため（ストリーミングSSR対応）。`await` にすると完了を待つ

**Appコンポーネント（サーバーSSR → クライアントhydration）:**
- `Route.useRouteContext()` でcontextを取得
- `useSuspenseQuery` は同じ `queryKey: ["hello"]` でキャッシュを参照する
- SSR時: loaderがキャッシュに入れたデータをそのまま使う（再度fetchしない）
- クライアントhydration時: SSRで埋め込まれたdehydrated stateからキャッシュを復元（再度fetchしない）
- キャッシュが古くなった後: `queryFn` が実行され、HTTP経由でAPIを再取得する

**`api.api.main.$get()` のパス構造:**
- `api` — contextから取得したクライアントインスタンス
- `.api.main` — `basePath("/api/main")` に対応するパス
- `.$get()` — GETリクエスト。`app.get("/", ...)` で定義したルートに対応

---

## データの流れ（時系列）

### 1. サーバー起動時

```
getRouter() 実行
  → new QueryClient() でキャッシュ作成
  → makeApiClient() で サーバー用クライアント作成（app.fetch直接呼び出し版）
  → router の context に両方セット
```

### 2. ユーザーが `/` にアクセス（SSR）

```
loader({ context }) 実行 [サーバー上]
  → context.api.api.main.$get()
  → hc が内部で fetch("http://localhost/api/main", { method: "GET" }) を呼ぶ
  → カスタムfetchが app.fetch(new Request(...)) に変換
  → Hono が "Hello Hono!" を返す
  → QueryClient キャッシュ: { ["hello"]: "Hello Hono!" }

App コンポーネントレンダリング [サーバー上]
  → useSuspenseQuery({ queryKey: ["hello"] })
  → キャッシュにヒット → "Hello Hono!" を返す（fetchしない）
  → HTMLをレンダリング: <span>Hello Hono!</span>

setupRouterSsrQueryIntegration の処理
  → QueryClient のキャッシュをJSON化してHTMLに埋め込む（dehydrate）
  → HTMLをクライアントに送信
```

### 3. ブラウザがHTMLを受信（Hydration）

```
ブラウザがHTMLを表示（すでに "Hello Hono!" が見えている）
  → JavaScriptが読み込まれる
  → dehydrated state から QueryClient キャッシュを復元（hydrate）
  → useSuspenseQuery({ queryKey: ["hello"] })
  → キャッシュにヒット → "Hello Hono!" を返す（fetchしない）
  → Hydration完了（画面の変化なし）
```

### 4. キャッシュが古くなった後（ページ再訪問、refetch等）

```
useSuspenseQuery の queryFn 実行 [ブラウザ上]
  → api.api.main.$get()
  → hc がブラウザの fetch("http://localhost:3000/api/main") を呼ぶ
  → HTTP リクエスト → main.$.ts → app.fetch(request) → Hono → レスポンス
  → キャッシュを更新
```

---

## t3-turbo (tRPC) との対応関係

| 役割 | t3-turbo (tRPC) | このプロジェクト (Hono RPC) |
|------|-----------------|---------------------------|
| API定義 | tRPCルーター + プロシージャ | Honoアプリ + ルート定義 |
| 型エクスポート | `AppRouter` | `AppType` |
| クライアント生成 | `createTRPCClient` | `hc<AppType>` |
| サーバー直接呼び | `unstable_localLink` | カスタムfetch + `app.fetch()` |
| HTTP経由呼び出し | `httpBatchStreamLink` | 標準 `fetch` |
| サーバー/クライアント分岐 | `createIsomorphicFn` | `createIsomorphicFn`（同じ） |
| SSR統合 | `setupRouterSsrQueryIntegration` | `setupRouterSsrQueryIntegration`（同じ） |
| APIルートマウント | `trpc.$.ts` + `fetchRequestHandler` | `main.$.ts` + `app.fetch` |
| ルートでの使い方 | `trpc.post.all.queryOptions()` | `{ queryKey, queryFn }` を手動定義 |
