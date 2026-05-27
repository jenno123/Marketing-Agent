"use client";

import { useState, useEffect, useCallback } from "react";
import { Museum } from "@/lib/museums";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Check, Eye, EyeOff, Save, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

type Post = { id: string; message: string; created_time: string };

export function MetaImport({ museum }: { museum: Museum }) {
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [savingToken, setSavingToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  // Load existing token on mount
  const loadToken = useCallback(async () => {
    const res = await fetch(`/api/indstillinger?nøgle=${museum.slug}_meta_token`);
    const { værdi } = await res.json();
    if (værdi) setToken(værdi);
  }, [museum.slug]);

  useEffect(() => { loadToken(); }, [loadToken]);

  async function saveToken() {
    if (!token.trim()) return;
    setSavingToken(true);
    const res = await fetch("/api/indstillinger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nøgle: `${museum.slug}_meta_token`, værdi: token.trim() }),
    });
    if (res.ok) {
      toast.success("Token gemt");
      setTokenSaved(true);
      setTimeout(() => setTokenSaved(false), 3000);
    } else {
      toast.error("Kunne ikke gemme token");
    }
    setSavingToken(false);
  }

  async function fetchPosts() {
    setFetching(true);
    setFetchError(null);
    setPosts([]);
    setHasFetched(false);
    setAdded(new Set());

    const res = await fetch(`/api/meta/posts?slug=${museum.slug}`);
    const data = await res.json();

    if (!res.ok) {
      setFetchError(data.error ?? "Ukendt fejl");
    } else {
      setPosts(data.posts ?? []);
      setHasFetched(true);
      if ((data.posts ?? []).length === 0) {
        setFetchError("Ingen opslag med tekst fundet på siden");
      }
    }
    setFetching(false);
  }

  async function addAsInspiration(post: Post) {
    setAdding(post.id);
    const res = await fetch("/api/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: museum.supabaseKeys.facebookInspiration,
        opslag: post.message,
      }),
    });
    if (res.ok) {
      setAdded((prev) => new Set(prev).add(post.id));
      toast.success("Tilføjet til Facebook-inspiration");
    } else {
      toast.error("Kunne ikke tilføje");
    }
    setAdding(null);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("da-DK", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  const hasToken = token.trim().length > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-stone-700">Facebook Page Access Token</h2>
        <p className="text-xs text-stone-400 leading-relaxed">
          Hent et token fra{" "}
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-600 transition-colors"
          >
            Meta Graph API Explorer
          </a>{" "}
          — vælg din side under "User or Page", tilføj <code className="bg-stone-100 px-1 rounded text-[11px]">pages_read_engagement</code> og klik "Generate Access Token". Tokenet holder 60 dage.
        </p>
      </div>

      {/* Token input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={tokenVisible ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAxxxxxx..."
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 font-mono focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setTokenVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              {tokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={saveToken}
            disabled={!hasToken || savingToken}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40",
              tokenSaved
                ? "bg-emerald-600 text-white"
                : "bg-[#3C2415] text-stone-50 hover:bg-[#4A2E1C]"
            )}
          >
            {savingToken ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tokenSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {tokenSaved ? "Gemt" : "Gem"}
          </button>
        </div>
      </div>

      {/* Fetch button */}
      <div className="space-y-4">
        <button
          onClick={fetchPosts}
          disabled={!hasToken || fetching}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {fetching ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Henter opslag...</>
          ) : (
            <><Facebook className="w-4 h-4" /> Hent seneste opslag</>
          )}
        </button>
        {!hasToken && (
          <p className="text-xs text-stone-400">Gem et token ovenfor for at hente opslag.</p>
        )}
      </div>

      {/* Error */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Posts list */}
      {hasFetched && posts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
              {posts.length} opslag hentet
            </p>
            <p className="text-xs text-stone-400">
              {added.size} tilføjet som inspiration
            </p>
          </div>
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {posts.map((post) => {
              const isAdded = added.has(post.id);
              const isAdding = adding === post.id;
              return (
                <div
                  key={post.id}
                  className={cn(
                    "rounded-xl border bg-white shadow-sm overflow-hidden transition-colors",
                    isAdded ? "border-emerald-200 bg-emerald-50/40" : "border-stone-200"
                  )}
                >
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-stone-400">{formatDate(post.created_time)}</p>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed line-clamp-5">
                      {post.message}
                    </p>
                  </div>
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => !isAdded && addAsInspiration(post)}
                      disabled={isAdded || isAdding}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        isAdded
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : "bg-stone-100 text-stone-600 hover:bg-[#3C2415] hover:text-stone-50"
                      )}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isAdded ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {isAdded ? "Tilføjet" : "Tilføj som inspiration"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchPosts}
            disabled={fetching}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Hent igen
          </button>
        </div>
      )}
    </div>
  );
}
