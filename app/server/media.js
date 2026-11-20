// Video files uploaded by creators. The browser uploads straight to storage (files are larger than the app's
// request limit), with a short-lived upload URL that can only create that one file:
//  - SUPABASE_URL set (Vercel): Supabase Storage, bucket "videos", public read.
//  - AZURE_STORAGE_ACCOUNT set (Azure): Blob Storage, container "videos", public read. The upload URL is a
//    user delegation SAS signed with the app's managed identity, so there are no storage keys anywhere.
//  - Neither (local development): a local folder (data/media) served by the app.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, normalize as normPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const LOCAL_DIR = join(here, '..', 'data', 'media');
export const BUCKET = 'videos';
export const MAX_VIDEO = 50 * 1024 * 1024;
export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' };
const useSupabase = () => !!process.env.SUPABASE_URL;
const useAzure = () => !useSupabase() && !!process.env.AZURE_STORAGE_ACCOUNT;
// True when uploads go to cloud storage (the local upload routes are then switched off).
export const remoteStorage = () => useSupabase() || useAzure();

let storage;
async function bucket() {
  if (!storage) {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    storage = db.storage.from(BUCKET);
  }
  return storage;
}

// --- Azure Blob Storage ---
const blobBase = () => `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${BUCKET}`;
let blobService, delegation;
async function blobSas(path) {
  const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } = await import('@azure/storage-blob');
  if (!blobService) {
    const { DefaultAzureCredential } = await import('@azure/identity');
    const credential = new DefaultAzureCredential(
      process.env.AZURE_CLIENT_ID ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID } : undefined);
    blobService = new BlobServiceClient(`https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`, credential);
  }
  const now = Date.now();
  // One delegation key serves many uploads; a new one is fetched when less than an hour is left.
  if (!delegation || delegation.until - now < 60 * 60e3) {
    const until = now + 6 * 60 * 60e3;
    delegation = { key: await blobService.getUserDelegationKey(new Date(now - 5 * 60e3), new Date(until)), until };
  }
  return generateBlobSASQueryParameters({
    containerName: BUCKET, blobName: path,
    permissions: BlobSASPermissions.parse('c'),   // create only: cannot overwrite or read other files
    startsOn: new Date(now - 5 * 60e3), expiresOn: new Date(now + 15 * 60e3), protocol: SASProtocol.Https,
  }, delegation.key, process.env.AZURE_STORAGE_ACCOUNT).toString();
}

// A short-lived signature for local uploads (the local server is the storage).
const localSecret = randomBytes(16).toString('hex');
export const localToken = path => createHmac('sha256', localSecret).update(path).digest('hex');
export const safePath = path => /^[a-z0-9-]+\/[a-z0-9-]+\.(mp4|webm)$/.test(path);

export async function uploadTarget(path, type) {
  if (useSupabase()) {
    const { data, error } = await (await bucket()).createSignedUploadUrl(path);
    if (error) throw new Error(`Storage: ${error.message}`);
    return { url: data.signedUrl, headers: { 'content-type': type, 'x-upsert': 'false', 'cache-control': 'max-age=3600' } };
  }
  if (useAzure()) {
    return { url: `${blobBase()}/${path}?${await blobSas(path)}`,
      headers: { 'content-type': type, 'x-ms-blob-type': 'BlockBlob', 'x-ms-blob-cache-control': 'max-age=3600' } };
  }
  return { url: `/api/local-upload/${path}?token=${localToken(path)}`, headers: { 'content-type': type } };
}

export function publicUrl(path) {
  if (useSupabase()) return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  if (useAzure()) return `${blobBase()}/${path}`;
  return `/local-media/${path}`;
}

export async function exists(path) {
  if (remoteStorage()) {
    const r = await fetch(publicUrl(path), { method: 'HEAD' });
    return r.ok;
  }
  try { return (await stat(join(LOCAL_DIR, normPath(path)))).isFile(); } catch { return false; }
}

export async function writeLocal(path, buf) {
  const file = join(LOCAL_DIR, normPath(path));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
}
