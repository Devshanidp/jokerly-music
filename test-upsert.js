const { Client, Databases, ID, Query } = require('node-appwrite');

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(project)
  .setKey(apiKey);

const db = new Databases(client);

class SupabaseQueryBuilder {
  constructor(db, dbId, colId) {
    this.db = db;
    this.dbId = dbId;
    this.colId = colId;
    this.action = null;
    this.payload = null;
    this.queries = [];
    this.isSingle = false;
  }
  
  select(fields, options) {
    if (!this.action) this.action = 'select';
    return this;
  }
  
  upsert(payload, options) {
    this.action = 'upsert';
    this.payload = payload;
    return this;
  }
  
  single() {
    this.isSingle = true;
    return this;
  }
  
  _mapAppwriteDocument(doc) {
    if (!doc) return doc;
    const mapped = { ...doc };
    if (!mapped.id && mapped.$id) {
      mapped.id = mapped.$id;
    }
    return mapped;
  }
  
  _getUniqueKeysForCollection() {
    switch (this.colId) {
      case 'liked_songs': return ['user_id', 'track_uri'];
      default: return null;
    }
  }

  async then(resolve, reject) {
    try {
      if (this.action === 'select' || !this.action) {
        if (this.isSingle) {
          this.queries.push(Query.limit(1));
        }
        const res = await this.db.listDocuments(this.dbId, this.colId, this.queries);
        let data = res.documents.map(d => this._mapAppwriteDocument(d));
        if (this.isSingle) {
          if (data.length === 0) {
             resolve({ data: null, error: { message: 'Row not found' } });
             return;
          }
          data = data[0];
        }
        resolve({ data, error: null });
      } else if (this.action === 'upsert') {
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
    } catch (e) {
      resolve({ data: null, error: { message: e.message || String(e) } });
    }
  }
}

async function run() {
  const builder = new SupabaseQueryBuilder(db, databaseId, 'liked_songs');
  const res = await builder.upsert({
    user_id: 'test_user',
    track_uri: 'spotify:track:test',
    track_name: 'Test Song',
    liked_at: new Date().toISOString()
  }).select().single();
  console.log(res);
}
run();