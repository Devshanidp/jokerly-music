import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    userId: string;
    authScope?: string;
    error?: string;
    user: DefaultSession["user"];
  }
}
