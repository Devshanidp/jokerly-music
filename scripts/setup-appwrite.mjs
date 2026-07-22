import { Client, Databases, ID } from "node-appwrite";
import "dotenv/config";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT?.trim();
const apiKey = process.env.APPWRITE_API_KEY?.trim();
let databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID?.trim();

if (!endpoint || !project || !apiKey) {
  console.error("Missing Appwrite environment variables in .env.local.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);

async function setup() {
  if (!databaseId) {
    console.log("No NEXT_PUBLIC_APPWRITE_DATABASE_ID provided. Creating database 'jokerly_music'...");
    const db = await databases.create(ID.unique(), "jokerly_music");
    databaseId = db.$id;
    console.log(`Database created with ID: ${databaseId}`);
    console.log(`Please add NEXT_PUBLIC_APPWRITE_DATABASE_ID=${databaseId} to your .env.local file.`);
  } else {
    console.log(`Using existing database ID: ${databaseId}`);
  }

  const collections = [
    {
      id: "user_language_prefs",
      name: "User Language Prefs",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "languages", required: false, array: true, size: 255 },
        { type: "string", key: "favorite_artists", required: false, size: 1000000 },
        { type: "datetime", key: "updated_at", required: false },
      ],
      indexes: [
        { key: "user_id_idx", type: "unique", attributes: ["user_id"] }
      ]
    },
    {
      id: "liked_songs",
      name: "Liked Songs",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "track_uri", required: true, size: 255 },
        { type: "string", key: "track_name", required: true, size: 255 },
        { type: "string", key: "track_image", required: false, size: 2048 },
        { type: "string", key: "track_artist", required: false, size: 255 },
        { type: "datetime", key: "liked_at", required: false },
      ],
      indexes: [
        { key: "user_track_unique", type: "unique", attributes: ["user_id", "track_uri"] },
        { key: "user_liked_idx", type: "key", attributes: ["user_id", "liked_at"], orders: ["DESC", "DESC"] }
      ]
    },
    {
      id: "liked_artists",
      name: "Liked Artists",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "artist_id", required: true, size: 255 },
        { type: "string", key: "artist_name", required: true, size: 255 },
        { type: "string", key: "artist_image", required: false, size: 2048 },
        { type: "datetime", key: "liked_at", required: false },
      ],
      indexes: [
        { key: "user_artist_unique", type: "unique", attributes: ["user_id", "artist_id"] },
        { key: "user_liked_idx", type: "key", attributes: ["user_id", "liked_at"], orders: ["DESC", "DESC"] }
      ]
    },
    {
      id: "recently_played",
      name: "Recently Played",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "track_uri", required: true, size: 255 },
        { type: "string", key: "track_name", required: true, size: 255 },
        { type: "string", key: "track_artist", required: true, size: 255 },
        { type: "string", key: "track_image", required: false, size: 2048 },
        { type: "datetime", key: "played_at", required: false },
      ],
      indexes: [
        { key: "user_track_unique", type: "unique", attributes: ["user_id", "track_uri"] },
        { key: "user_played_idx", type: "key", attributes: ["user_id", "played_at"], orders: ["DESC", "DESC"] }
      ]
    },
    {
      id: "pinned_playlists",
      name: "Pinned Playlists",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "playlist_id", required: true, size: 255 },
        { type: "string", key: "playlist_name", required: true, size: 255 },
        { type: "string", key: "playlist_image", required: false, size: 2048 },
        { type: "datetime", key: "pinned_at", required: false },
      ],
      indexes: [
        { key: "user_playlist_unique", type: "unique", attributes: ["user_id", "playlist_id"] }
      ]
    },
    {
      id: "playlists",
      name: "Playlists",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "name", required: true, size: 255 },
        { type: "string", key: "description", required: false, size: 2048 },
        { type: "string", key: "image", required: false, size: 2048 },
        { type: "datetime", key: "created_at", required: false },
        { type: "datetime", key: "updated_at", required: false },
      ],
      indexes: [
        { key: "user_idx", type: "key", attributes: ["user_id"] }
      ]
    },
    {
      id: "playlist_tracks",
      name: "Playlist Tracks",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "playlist_id", required: true, size: 255 },
        { type: "string", key: "track_uri", required: true, size: 255 },
        { type: "string", key: "track_name", required: true, size: 255 },
        { type: "datetime", key: "added_at", required: false },
        { type: "integer", key: "position", required: false },
      ],
      indexes: [
        { key: "playlist_idx", type: "key", attributes: ["playlist_id"] },
        { key: "user_idx", type: "key", attributes: ["user_id"] }
      ]
    },
    {
      id: "pinned_artists",
      name: "Pinned Artists",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "artist_id", required: true, size: 255 },
        { type: "string", key: "artist_name", required: true, size: 255 },
        { type: "string", key: "artist_image", required: false, size: 2048 },
        { type: "datetime", key: "pinned_at", required: false },
      ],
      indexes: [
        { key: "user_artist_unique", type: "unique", attributes: ["user_id", "artist_id"] }
      ]
    },
    {
      id: "push_subscriptions",
      name: "Push Subscriptions",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "endpoint", required: true, size: 2048 },
        { type: "string", key: "p256dh", required: true, size: 2048 },
        { type: "string", key: "auth", required: true, size: 255 },
        { type: "string", key: "subscription", required: true, size: 100000 },
        { type: "datetime", key: "created_at", required: false },
      ],
      indexes: [
        { key: "user_endpoint_unique", type: "unique", attributes: ["user_id", "endpoint"] },
        { key: "user_idx", type: "key", attributes: ["user_id"] }
      ]
    },
    {
      id: "artist_release_seen",
      name: "Artist Release Seen",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "artist_id", required: true, size: 255 },
        { type: "string", key: "artist_name", required: false, size: 255 },
        { type: "string", key: "last_release_id", required: false, size: 255 },
        { type: "string", key: "last_release_name", required: false, size: 255 },
        { type: "datetime", key: "updated_at", required: false },
      ],
      indexes: [
        { key: "user_artist_unique", type: "unique", attributes: ["user_id", "artist_id"] },
        { key: "user_idx", type: "key", attributes: ["user_id"] }
      ]
    },
    {
      id: "listening_analytics",
      name: "Listening Analytics",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "event_type", required: true, size: 255 },
        { type: "string", key: "track_uri", required: false, size: 255 },
        { type: "string", key: "track_name", required: false, size: 255 },
        { type: "string", key: "track_artist", required: false, size: 255 },
        { type: "string", key: "meta", required: false, size: 100000 },
        { type: "datetime", key: "created_at", required: false },
      ],
      indexes: [
        { key: "user_created_idx", type: "key", attributes: ["user_id", "created_at"], orders: ["DESC", "DESC"] },
        { key: "type_created_idx", type: "key", attributes: ["event_type", "created_at"], orders: ["DESC", "DESC"] }
      ]
    },
    {
      id: "pinned_albums",
      name: "Pinned Albums",
      attributes: [
        { type: "string", key: "user_id", required: true, size: 255 },
        { type: "string", key: "album_id", required: true, size: 255 },
        { type: "string", key: "album_name", required: true, size: 255 },
        { type: "string", key: "album_image", required: false, size: 2048 },
        { type: "string", key: "artist_name", required: false, size: 255 },
        { type: "datetime", key: "pinned_at", required: false },
      ],
      indexes: [
        { key: "user_album_unique", type: "unique", attributes: ["user_id", "album_id"] }
      ]
    }
  ];

  for (const col of collections) {
    try {
      console.log(`Checking collection: ${col.id}...`);
      await databases.getCollection(databaseId, col.id);
      console.log(`Collection ${col.id} already exists.`);
    } catch (e) {
      if (e.code === 404) {
        console.log(`Creating collection: ${col.id}...`);
        await databases.createCollection(databaseId, col.id, col.name);
        
        for (const attr of col.attributes) {
          console.log(`  - Adding attribute: ${attr.key} (${attr.type})`);
          if (attr.type === "string") {
            await databases.createStringAttribute(databaseId, col.id, attr.key, attr.size, attr.required, undefined, attr.array);
          } else if (attr.type === "integer") {
            await databases.createIntegerAttribute(databaseId, col.id, attr.key, attr.required, undefined, undefined, undefined, attr.array);
          } else if (attr.type === "datetime") {
            await databases.createDatetimeAttribute(databaseId, col.id, attr.key, attr.required, undefined, attr.array);
          }
        }

        // Wait a bit for attributes to be ready before creating indexes
        console.log(`  - Waiting for attributes to be processed...`);
        await new Promise(r => setTimeout(r, 2500));

        for (const idx of col.indexes) {
          console.log(`  - Adding index: ${idx.key} (${idx.type})`);
          try {
            await databases.createIndex(databaseId, col.id, idx.key, idx.type, idx.attributes, idx.orders);
          } catch (idxErr) {
             console.error(`  - Failed to add index ${idx.key}:`, idxErr.message);
          }
        }
      } else {
        console.error(`Error checking collection ${col.id}:`, e);
      }
    }
  }

  console.log("Appwrite setup complete!");
}

setup().catch(console.error);
