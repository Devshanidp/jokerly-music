import { Suspense } from "react";
import PlaylistsClient from "./PlaylistsClient";

export default function PlaylistsPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistsClient />
    </Suspense>
  );
}
