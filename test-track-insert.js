const { Client, Databases, ID } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(project)
  .setKey(apiKey);

const db = new Databases(client);

async function test() {
  try {
    const res = await db.createDocument(databaseId, 'playlist_tracks', ID.unique(), {
        user_id: 'test_user',
        playlist_id: '6a60bf9e001896a88812',
        track_uri: 'spotify:track:456',
        track_name: 'Test Track',
        track_image: 'https://example.com/image.png',
        track_artist: 'Test Artist',
        position: 1,
        added_at: new Date().toISOString()
    });
    console.log('Insert success:', res.$id);
    await db.deleteDocument(databaseId, 'playlist_tracks', res.$id);
  } catch (e) {
    console.error('Insert error:', e.message);
  }
}
test();