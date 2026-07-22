"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Check, Loader2, Music2, Mic2, Plus } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { MusicArtist, artistImage } from "@/types/music-catalog";
import Image from "next/image";
import { useBackHandler } from "@/hooks/useBackHandler";

export interface FavoriteArtist {
  id: string;
  name: string;
  image?: string | null;
}

interface Props {
  initialLangs: string[];
  initialArtists: FavoriteArtist[];
  onSave: (langs: string[], artists: FavoriteArtist[]) => void;
  onClose: () => void;
}

export default function PersonalizeSheet({ initialLangs, initialArtists, onSave, onClose }: Props) {
  useBackHandler(true, onClose);

  const [selectedLangs, setSelectedLangs] = useState<string[]>(initialLangs);
  const [selectedArtists, setSelectedArtists] = useState<FavoriteArtist[]>(initialArtists);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<MusicArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"langs" | "artists">("langs");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Debounced artist search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (artistQuery.trim().length < 2) { setArtistResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(artistQuery)}&type=artist&limit=8`);
        const data = await res.json();
        setArtistResults(data.artists ?? []);
      } catch { setArtistResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [artistQuery]);

  const toggleLang = (id: string) => {
    setSelectedLangs((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const addArtist = (artist: MusicArtist) => {
    if (selectedArtists.find((a) => a.id === artist.id)) return;
    setSelectedArtists((prev) => [...prev, {
      id: artist.id,
      name: artist.name,
      image: artistImage(artist) ?? null,
    }]);
    setArtistQuery("");
    setArtistResults([]);
  };

  const removeArtist = (id: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (selectedLangs.length === 0) return;
    setSaving(true);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languages: selectedLangs, favoriteArtists: selectedArtists }),
    }).catch(() => {});
    onSave(selectedLangs, selectedArtists);
    setSaving(false);
    onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
    >
      <div className="sheet-light w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden border border-black/10 shadow-2xl"
        style={{ background: "var(--surface)", maxHeight: "min(88vh, calc(100vh - 16px))", marginBottom: "max(0px, env(safe-area-inset-bottom))" }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Personalize</h2>
            <p className="text-white/35 text-xs mt-0.5">Choose your languages & favourite artists</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 px-5 pb-3 shrink-0">
          {(["langs", "artists"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "btn-nav-active text-white"
                  : "text-white/40 hover:text-white border border-white/[0.08]"
              }`}
              style={activeTab !== tab ? { background: "var(--card)" } : {}}>
              {tab === "langs" ? "🌐 Languages" : "🎤 Artists"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">

          {/* Languages tab */}
          {activeTab === "langs" && (
            <div className="space-y-2">
              <p className="text-white/30 text-xs px-1 mb-3">Tap to toggle languages for your feed</p>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => {
                  const selected = selectedLangs.includes(lang.id);
                  return (
                    <button key={lang.id} onClick={() => toggleLang(lang.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left border transition-all ${
                        selected
                          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10"
                          : "border-white/[0.07] hover:border-white/[0.15]"
                      }`}
                      style={!selected ? { background: "var(--card)" } : {}}>
                      <span className="text-lg leading-none">{lang.emoji}</span>
                      <span className={`text-sm font-medium flex-1 ${selected ? "text-[var(--accent)]" : "text-white/70"}`}>
                        {lang.label}
                      </span>
                      {selected && (
                        <div className="w-5 h-5 rounded-full btn-nav-active flex items-center justify-center shrink-0">
                          <Check size={11} className="text-white" strokeWidth={2.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedLangs.length === 0 && (
                <p className="text-center text-[var(--accent)]/70 text-xs py-2">Select at least one language</p>
              )}
            </div>
          )}

          {/* Artists tab */}
          {activeTab === "artists" && (
            <div className="space-y-4">
              {/* Selected artists */}
              {selectedArtists.length > 0 && (
                <div className="space-y-2">
                  <p className="text-white/30 text-xs px-1">Your favourite artists ({selectedArtists.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10">
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-white/[0.08]">
                          {a.image
                            ? <Image src={a.image} alt={a.name} width={24} height={24} unoptimized className="object-cover w-full h-full" />
                            : <div className="w-full h-full flex items-center justify-center"><Mic2 size={10} className="text-white/30" /></div>}
                        </div>
                        <span className="text-[var(--accent)] text-xs font-medium">{a.name}</span>
                        <button onClick={() => removeArtist(a.id)} className="text-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors ml-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  placeholder="Search artists…"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-white/[0.08] text-white placeholder-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]//50 transition-all"
                  style={{ background: "var(--card)" }}
                  autoComplete="off"
                />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30" />}
              </div>

              {/* Results */}
              {artistResults.length > 0 && (
                <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "var(--card)" }}>
                  {artistResults.map((artist) => {
                    const already = !!selectedArtists.find((a) => a.id === artist.id);
                    return (
                      <button key={artist.id} onClick={() => !already && addArtist(artist)}
                        disabled={already}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.04] last:border-0 text-left transition-colors ${
                          already ? "opacity-50 cursor-default" : "hover:bg-white/[0.05]"
                        }`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-white/[0.07]">
                          {artistImage(artist)
                            ? <Image src={artistImage(artist)!} alt={artist.name} width={36} height={36} unoptimized className="object-cover w-full h-full" />
                            : <div className="w-full h-full flex items-center justify-center"><Mic2 size={14} className="text-white/25" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                          {artist.followers?.total != null && (
                            <p className="text-white/30 text-xs">{artist.followers.total.toLocaleString()} followers</p>
                          )}
                        </div>
                        {already
                          ? <Check size={14} className="text-[var(--accent)] shrink-0" />
                          : <Plus size={14} className="text-white/30 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {artistQuery.trim().length >= 2 && !searching && artistResults.length === 0 && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Music2 size={24} className="text-white/15" />
                  <p className="text-white/30 text-sm">No artists found</p>
                </div>
              )}

              {selectedArtists.length === 0 && artistQuery.trim().length < 2 && (
                <p className="text-white/20 text-xs text-center py-4">
                  Add artists you love — we'll tailor your "For You" section
                </p>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pt-3 shrink-0 border-t border-white/[0.06]"
          style={{ paddingBottom: "max(24px, calc(env(safe-area-inset-bottom) + 12px))" }}>
          <button
            onClick={handleSave}
            disabled={saving || selectedLangs.length === 0}
            className="btn-nav-active w-full py-3.5 rounded-2xl text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
