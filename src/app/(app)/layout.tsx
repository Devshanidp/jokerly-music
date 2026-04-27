import Topbar from "@/components/layout/Topbar";
import PlayerBar from "@/components/layout/PlayerBar";
import FloatingNav from "@/components/layout/FloatingNav";
import ToastContainer from "@/components/layout/ToastContainer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <Topbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 pb-32">
        {children}
      </main>
      <PlayerBar />
      <FloatingNav />
      <ToastContainer />
    </div>
  );
}
