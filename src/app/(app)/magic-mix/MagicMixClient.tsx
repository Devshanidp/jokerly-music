"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2, Music, Loader2, ArrowRight } from "lucide-react";
import { useToastStore } from "@/store/toast";

export default function MagicMixClient() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.toast);
  
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState("");

  const examples = [
    "A late-night driving playlist with synthwave and chill R&B",
    "Upbeat gym workout songs blending English Pop and Hindi Rap",
    "Cozy rainy day acoustic tracks from the 2010s",
    "High energy EDM for gaming sessions",
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgressText("Consulting the AI music oracle...");
    
    try {
      // Small simulated delay for UX
      setTimeout(() => setProgressText("Searching the catalog for perfect tracks..."), 1000);
      setTimeout(() => setProgressText("Compiling your magic mix..."), 2000);

      const res = await fetch("/api/magic-mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate playlist");
      }

      showToast(`Created ✨ ${data.name} with ${data.trackCount} tracks!`);
      // Redirect to the newly created playlist
      router.push(`/playlist/${data.playlistId}`);
      
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Something went wrong generating the mix", "error");
      setIsGenerating(false);
      setProgressText("");
    }
  };

  return (
    <div className="flex flex-col h-full pt-4 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Magic Mix</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Describe your vibe, let AI curate the music.</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="mb-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl transition-opacity opacity-0 group-focus-within:opacity-100" />
          <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-2 flex flex-col focus-within:border-purple-500/50 transition-colors shadow-2xl shadow-black/50">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="E.g., A focused coding session playlist with lofi beats and no vocals..."
              className="w-full bg-transparent resize-none h-28 p-4 text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
              maxLength={300}
            />
            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/[0.04]">
              <span className="text-[10px] font-medium text-zinc-600">
                {prompt.length}/300
              </span>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Create Mix
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 animate-in fade-in zoom-in duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-purple-500/30 flex items-center justify-center relative z-10">
              <Sparkles size={32} className="text-purple-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">{progressText}</h3>
          <p className="text-sm text-zinc-500 text-center max-w-xs">
            Finding the perfect tracks and building your playlist...
          </p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Music size={14} />
            Try these prompts
          </h3>
          <div className="flex flex-col gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-left w-full p-4 rounded-2xl bg-zinc-900/50 border border-white/[0.04] hover:bg-zinc-800 hover:border-white/10 transition-colors flex items-center justify-between group"
              >
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors line-clamp-1 pr-4">{ex}</span>
                <ArrowRight size={14} className="text-zinc-600 group-hover:text-purple-400 transition-colors shrink-0 -translate-x-2 group-hover:translate-x-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
