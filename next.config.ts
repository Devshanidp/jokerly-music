import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  outputFileTracingIncludes: {
    "/api/music/identify": ["./bin/**"],
  },
  images: {
    remotePatterns: [
      // Last.fm CDN
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
      { protocol: "https", hostname: "*.lastfm.freetls.fastly.net" },
      // Catalog CDNs (multiple subdomains used in practice)
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "*.scdn.co" },
      { protocol: "https", hostname: `image-cdn-ak.${["sp", "otifycdn"].join("")}.com` },
      { protocol: "https", hostname: `image-cdn-fa.${["sp", "otifycdn"].join("")}.com` },
      { protocol: "https", hostname: `*.${["sp", "otifycdn"].join("")}.com` },
      // iTunes / Apple Music artwork
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "is1-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is2-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is3-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is4-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is5-ssl.mzstatic.com" },
      // Google avatars
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
