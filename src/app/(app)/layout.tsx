import { cookies } from "next/headers";
import Topbar from "@/components/layout/Topbar";
import PlayerBar from "@/components/layout/PlayerBar";
import ToastContainer from "@/components/layout/ToastContainer";
import { isGuestRequest } from "@/lib/guest";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const guest = isGuestRequest(jar.getAll());

  return (
    <div className="flex flex-col min-h-screen relative" style={{ background: "transparent" }}>
      {!guest && <Topbar />}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-44 relative z-10">
        {children}
      </main>
      {!guest && <PlayerBar />}
      <ToastContainer />
    </div>
  );
}
