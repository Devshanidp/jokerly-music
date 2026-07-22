/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Client, Databases, Query, ID } from "node-appwrite";

export function isAppwriteConfigured(): boolean {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID?.trim();
  return !!(endpoint && project && apiKey && databaseId);
}


class SupabaseQueryBuilder {
  private db: Databases;
  private dbId: string;
  private colId: string;
  private action: "select" | "insert" | "upsert" | "update" | "delete" | null = null;
  private payload: any = null;
  private queries: string[] = [];
  private isSingle = false;
  private isMaybeSingle = false;
  private returnCount = false;
  private selectedFields?: string;

  constructor(db: Databases, dbId: string, colId: string) {
    this.db = db;
    this.dbId = dbId;
    this.colId = colId;
  }

  select(fields?: string, options?: { count?: "exact" | "planned" | "estimated", head?: boolean }) {
    this.action = "select";
    if (fields) this.selectedFields = fields;
    if (options?.count) {
      this.returnCount = true;
    }
    return this;
  }

  insert(payload: any | any[]) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: any | any[], options?: { onConflict?: string }) {
    this.action = "upsert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.queries.push(Query.equal(column, value));
    return this;
  }

  in(column: string, values: any[]) {
    this.queries.push(Query.contains(column, values));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    if (options?.ascending === false) {
      this.queries.push(Query.orderDesc(column));
    } else {
      this.queries.push(Query.orderAsc(column));
    }
    return this;
  }

  limit(count: number) {
    this.queries.push(Query.limit(count));
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private _getUniqueKeysForCollection(): string[] | null {
    switch (this.colId) {
      case "liked_songs": return ["user_id", "track_uri"];
      case "liked_artists": return ["user_id", "artist_id"];
      case "recently_played": return ["user_id", "track_uri"];
      case "pinned_playlists": return ["user_id", "playlist_id"];
      case "playlist_tracks": return ["playlist_id", "track_uri"];
      case "pinned_artists": return ["user_id", "artist_id"];
      case "push_subscriptions": return ["user_id", "endpoint"];
      case "artist_release_seen": return ["user_id", "artist_id"];
      case "pinned_albums": return ["user_id", "album_id"];
      case "user_language_prefs": return ["user_id"];
      default: return null;
    }
  }

  private _mapAppwriteDocument(doc: any) {
    if (!doc) return doc;
    const mapped = { ...doc };
    if (!mapped.id && mapped.$id) {
      mapped.id = mapped.$id;
    }
    return mapped;
  }

  async then(resolve: (value: any) => void, reject: (reason: any) => void) {
    try {
      if (this.action === "select" || !this.action) {
        if (this.isSingle || this.isMaybeSingle) {
          this.queries.push(Query.limit(1));
        }
        const res = await this.db.listDocuments(this.dbId, this.colId, this.queries);
        let data: any = res.documents.map(d => this._mapAppwriteDocument(d));
        
        if (this.colId === "playlists" && this.selectedFields?.includes("playlist_tracks(count)")) {
          for (const doc of data) {
            try {
              const t = await this.db.listDocuments(this.dbId, "playlist_tracks", [
                Query.equal("playlist_id", doc.id || doc.$id)
              ]);
              doc.playlist_tracks = [{ count: t.total }];
            } catch (e) {
              doc.playlist_tracks = [{ count: 0 }];
            }
          }
        }

        if (this.isSingle) {
          if (data.length === 0) {
             resolve({ data: null, error: { message: "Row not found" } });
             return;
          }
          data = data[0];
        } else if (this.isMaybeSingle) {
          if (data.length === 0) {
             resolve({ data: null, error: null });
             return;
          }
          data = data[0];
        }
        if (this.returnCount) {
           resolve({ data, count: res.total, error: null });
           return;
        }
        resolve({ data, error: null });
      } 
      
      else if (this.action === "delete") {
        // Appwrite requires finding the documents first
        const res = await this.db.listDocuments(this.dbId, this.colId, this.queries);
        for (const doc of res.documents) {
          await this.db.deleteDocument(this.dbId, this.colId, doc.$id);
        }
        resolve({ data: null, error: null });
      } 
      
      else if (this.action === "insert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results = [];
        for (const item of items) {
          const docId = item.id || ID.unique();
          delete item.id; // Appwrite manages $id
          const doc = await this.db.createDocument(this.dbId, this.colId, docId, item);
          results.push(this._mapAppwriteDocument(doc));
        }
        const data = Array.isArray(this.payload) ? results : results[0];
        resolve({ data, error: null });
      }

      else if (this.action === "update") {
         const res = await this.db.listDocuments(this.dbId, this.colId, this.queries);
         const results = [];
         for (const doc of res.documents) {
           const updated = await this.db.updateDocument(this.dbId, this.colId, doc.$id, this.payload);
           results.push(this._mapAppwriteDocument(updated));
         }
         const data = this.isSingle ? results[0] : results;
         resolve({ data, error: null });
      }
      
      else if (this.action === "upsert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results = [];
        const keys = this._getUniqueKeysForCollection();
        
        for (const item of items) {
          let existingDoc = null;
          
          if (item.id) {
             try {
                existingDoc = await this.db.getDocument(this.dbId, this.colId, item.id);
             } catch(e) {}
          } else if (keys && keys.length > 0) {
             const searchQueries = keys.map(k => Query.equal(k, item[k]));
             searchQueries.push(Query.limit(1));
             const searchRes = await this.db.listDocuments(this.dbId, this.colId, searchQueries);
             if (searchRes.documents.length > 0) {
               existingDoc = searchRes.documents[0];
             }
          }

          const docId = item.id || ID.unique();
          delete item.id;
          
          if (existingDoc) {
             const updated = await this.db.updateDocument(this.dbId, this.colId, existingDoc.$id, item);
             results.push(this._mapAppwriteDocument(updated));
          } else {
             const created = await this.db.createDocument(this.dbId, this.colId, docId, item);
             results.push(this._mapAppwriteDocument(created));
          }
        }
        const data = Array.isArray(this.payload) ? results : results[0];
        resolve({ data, error: null });
      }
    } catch (e: any) {
      resolve({ data: null, error: { message: e.message || String(e) } });
    }
  }
}

class SupabaseClientMock {
  private db: Databases;
  private dbId: string;

  constructor(db: Databases, dbId: string) {
    this.db = db;
    this.dbId = dbId;
  }

  from(collection: string) {
    return new SupabaseQueryBuilder(this.db, this.dbId, collection);
  }
  
  // Also provide rpc for trim_recently_played
  async rpc(func: string, args: any) {
    if (func === "trim_recently_played") {
      const userId = args.p_user_id;
      // We manually keep only the 20 most recent
      const res = await this.db.listDocuments(this.dbId, "recently_played", [
         Query.equal("user_id", userId),
         Query.orderDesc("played_at")
      ]);
      if (res.documents.length > 20) {
         const toDelete = res.documents.slice(20);
         for (const doc of toDelete) {
            await this.db.deleteDocument(this.dbId, "recently_played", doc.$id);
         }
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }
}

export async function createClient() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID?.trim();

  if (!endpoint || !project || !apiKey || !databaseId) {
    throw new Error("Missing Appwrite configuration");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);

  const databases = new Databases(client);
  return new SupabaseClientMock(databases, databaseId);
}
