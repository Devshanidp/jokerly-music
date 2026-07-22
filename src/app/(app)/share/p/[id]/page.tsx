import SharePlaylistClient from "./SharePlaylistClient";

export default async function SharePlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SharePlaylistClient playlistId={id} />;
}
