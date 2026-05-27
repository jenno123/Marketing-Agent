"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Forkert e-mail eller adgangskode");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setRegistered(true);
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#3C2415] flex items-center justify-center mb-3 shadow-sm">
            <Sparkles className="w-5 h-5 text-stone-200" />
          </div>
          <p className="text-xl font-semibold text-stone-800 tracking-tight">
            Push<span className="text-stone-400">.ai</span>
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Marketing Agent</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-7">
          {registered ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-stone-800">Tjek din indbakke</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                Vi har sendt et bekræftelseslink til <strong>{email}</strong>.
                Klik på linket for at aktivere din konto.
              </p>
              <button
                onClick={() => { setRegistered(false); setTab("login"); }}
                className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors mt-2"
              >
                Tilbage til log ind
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-6">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(null); }}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                      tab === t
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    {t === "login" ? "Log ind" : "Opret konto"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="din@email.dk"
                    required
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600">Adgangskode</label>
                  <div className="relative">
                    <input
                      type={visible ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {tab === "register" && (
                    <p className="text-xs text-stone-400">Mindst 6 tegn</p>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#3C2415] hover:bg-[#4A2E1C] text-stone-50 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {tab === "login" ? "Log ind" : "Opret konto"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-5">
          De Kulturhistoriske Museer i Holstebro Kommune
        </p>
      </div>
    </div>
  );
}
