"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import { LogOut, Sun, Moon, Settings, X, User } from "lucide-react";

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 dark:bg-zinc-900 light:bg-white rounded-2xl w-full max-w-sm border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <User size={20} className="text-zinc-400" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">{session?.user?.name}</p>
              <p className="text-zinc-400 text-sm">{session?.user?.email}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          <div className="space-y-1">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Account</p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Topbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <header className="h-14 bg-black/80 backdrop-blur border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-bold text-lg tracking-tight">🎵 Jokerly</span>
        </div>

        <div className="flex items-center gap-2">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          <span className="text-zinc-300 text-sm font-medium hidden sm:block">
            {session?.user?.name}
          </span>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
