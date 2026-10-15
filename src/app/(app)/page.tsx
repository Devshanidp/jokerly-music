import { cookies } from "next/headers";
import GuestHome from "@/components/home/GuestHome";
import { isGuestRequest } from "@/lib/guest";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const jar = await cookies();
  if (isGuestRequest(jar.getAll())) return <GuestHome />;
  return <HomeClient />;
}
