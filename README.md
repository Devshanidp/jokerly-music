# 🎵 Jokerly Music

A full-featured music streaming app for web, Android and desktop, built with **Next.js, TypeScript and Supabase**.

> Screenshot: add `docs/screenshot-home.png` here

## Features

- **Search & stream** millions of songs, albums and artists
- **Playlists**: create, reorder with drag & drop, pin favourites
- **Liked songs, recently played and queue** management
- **Synced lyrics** panel while a song plays
- **Magic Mix & Recommendations**: personalised mixes based on what you listen to
- **Time Machine**: rediscover music from past years
- **Share now-playing** cards with friends
- **Downloads** for offline listening
- **Push notifications** and a device picker
- **Login & onboarding** with NextAuth
- **Light & dark themes**
- Runs as an **Android app** (TWA) and a **desktop app**

## Tech stack

| Area | Tools |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| State | Zustand |
| Backend | Next.js API routes, Supabase, Appwrite |
| Auth | NextAuth |
| Other | dnd-kit (drag & drop), Web Push, Zod |

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Copy your Supabase / Appwrite keys into `.env.local` first.

## Author

Built by **Shanid (devShan)**. [GitHub](https://github.com/Devshanidp)
