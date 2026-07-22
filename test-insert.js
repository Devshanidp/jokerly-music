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
  
  insert(payload, options) {
    this.action = 'insert';
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
      } else if (this.action === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results = [];
        for (const item of items) {
          const docId = item.id || ID.unique();
          delete item.id;
          const doc = await this.db.createDocument(this.dbId, this.colId, docId, item);
          results.push(this._mapAppwriteDocument(doc));
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
  const builder = new SupabaseQueryBuilder(db, databaseId, 'playlists');
  const res = await builder.insert({
    user_id: 'test_user',
    name: 'ok',
    description: '',
    image: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single();
  console.log(res);
}
run();