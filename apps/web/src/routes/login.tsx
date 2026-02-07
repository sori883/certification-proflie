import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        setError(result.error.message ?? "サインインに失敗しました");
        return;
      }
      await navigate({ href: "/login", replace: true });
    } catch {
      setError("サインインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (result.error) {
        setError(result.error.message ?? "サインアップに失敗しました");
        return;
      }
      await navigate({ href: "/login", replace: true });
    } catch {
      setError("サインアップに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/login",
    });
    if (!res.data?.url) {
      setError("Google認証のURLを取得できませんでした");
      return;
    }
    await navigate({ href: res.data.url, replace: true });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ href: "/login", replace: true });
  };

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-800 to-black p-4 text-white">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/50 p-8 shadow-xl backdrop-blur-md">
          <h1 className="mb-6 text-2xl font-bold">ログイン済み</h1>
          <div className="mb-6 space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
            <p>
              <span className="text-gray-400">名前:</span> {session.user.name}
            </p>
            <p>
              <span className="text-gray-400">メール:</span>{" "}
              {session.user.email}
            </p>
            <p>
              <span className="text-gray-400">ID:</span> {session.user.id}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-bold text-white transition-colors hover:bg-red-700"
          >
            サインアウト
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-800 to-black p-4 text-white">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/50 p-8 shadow-xl backdrop-blur-md">
        <h1 className="mb-6 text-2xl font-bold">認証テスト</h1>

        <div className="mb-6 flex rounded-lg border border-white/10 bg-white/5">
          <button
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
              mode === "signin"
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            サインイン
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
              mode === "signup"
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            サインアップ
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-transparent focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-transparent focus:ring-2 focus:ring-cyan-400 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-transparent focus:ring-2 focus:ring-cyan-400 focus:outline-none"
          />
          <button
            onClick={mode === "signin" ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 font-bold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "処理中..."
              : mode === "signin"
                ? "サインイン"
                : "サインアップ"}
          </button>
        </div>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-sm text-gray-400">または</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-medium text-white transition-colors hover:bg-white/20"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Googleでサインイン
        </button>
      </div>
    </div>
  );
}
