// State store. The whole demo state is one small JSON document.
//  - SUPABASE_URL set (Vercel): one row in the Supabase table hub_state, using the server-only secret key.
//  - COSMOS_ENDPOINT set (Azure option): one Cosmos DB document, read with the app's managed identity.
//  - Neither (local): data/state.json next to the app.
// The choice is keyed on configuration, never on a request failing,
// so a database outage shows up as an error instead of silently serving local data.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const LOCAL_FILE = join(here, '..', 'data', 'state.json');
const DOC_ID = 'demo';

let backend;

async function cosmosBackend() {
  const { CosmosClient } = await import('@azure/cosmos');
  const { DefaultAzureCredential } = await import('@azure/identity');
  const client = new CosmosClient({ endpoint: process.env.COSMOS_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
  const container = client.database(process.env.COSMOS_DATABASE || 'learninghub').container(process.env.COSMOS_CONTAINER || 'state');
  return {
    name: 'cosmos',
    async read() {
      try {
        const { resource } = await container.item(DOC_ID, DOC_ID).read();
        return resource ? resource.state : null;
      } catch (e) {
        if (e.code === 404) return null;
        throw e;
      }
    },
    async write(state) { await container.items.upsert({ id: DOC_ID, state }); },
  };
}

async function supabaseBackend() {
  const { createClient } = await import('@supabase/supabase-js');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  const db = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    name: 'supabase',
    async read() {
      const { data, error } = await db.from('hub_state').select('state').eq('id', DOC_ID).maybeSingle();
      if (error) throw new Error(`Supabase read failed: ${error.message}`);
      return data ? data.state : null;
    },
    async write(state) {
      const { error } = await db.from('hub_state').upsert({ id: DOC_ID, state, updated_at: new Date().toISOString() });
      if (error) throw new Error(`Supabase write failed: ${error.message}`);
    },
  };
}

function fileBackend() {
  return {
    name: 'file',
    async read() {
      try { return JSON.parse(await readFile(LOCAL_FILE, 'utf8')); }
      catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    },
    async write(state) {
      await mkdir(dirname(LOCAL_FILE), { recursive: true });
      await writeFile(LOCAL_FILE, JSON.stringify(state, null, 2));
    },
  };
}

async function getBackend() {
  if (!backend) {
    backend = process.env.SUPABASE_URL ? await supabaseBackend()
      : process.env.COSMOS_ENDPOINT ? await cosmosBackend()
      : fileBackend();
  }
  return backend;
}

// Writes are serialised so two quick clicks cannot interleave a read-modify-write.
let queue = Promise.resolve();

export async function load() {
  const b = await getBackend();
  let state = await b.read();
  if (!state) { state = build(Date.now()); await b.write(state); }
  return state;
}

export function update(fn) {
  const run = queue.then(async () => {
    const b = await getBackend();
    const state = (await b.read()) || build(Date.now());
    const result = await fn(state);
    await b.write(state);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function reset() {
  const b = await getBackend();
  const state = build(Date.now());
  await b.write(state);
  return state;
}

export async function backendName() { return (await getBackend()).name; }
