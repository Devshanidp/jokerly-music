import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/components/layout/SessionWrapper";
import ThemeProvider from "@/components/layout/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jokerly Music",
  description: "Discover, search, and manage your music",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} antialiased h-full`}>
        <ThemeProvider>
          <SessionWrapper>{children}</SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
