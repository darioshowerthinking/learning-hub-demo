// Live video avatar for practice sessions. Two providers, picked with AVATAR_PROVIDER:
//  - "liveavatar" (default): LiveAvatar by HeyGen. Credits per minute; the account plan caps the session length.
//  - "azure": Azure AI Speech real-time avatar on the Foundry resource. Pay per use, sessions up to 30 minutes.
// Either way the avatar is only the HCP's face, voice and ears: Claude (roleplay.js) decides every word. The keys stay
// here; the browser gets short-lived tokens.
//
// LiveAvatar:
//  - LIVEAVATAR_API_KEY     the LiveAvatar API key (secret; Vercel env / Container Apps secret / app/.env.local)
//  - LIVEAVATAR_SANDBOX     "1" = sandbox: free, about 1 minute per session, only the stock sandbox avatar
//  - LIVEAVATAR_AVATAR_ID   the avatar to use outside sandbox
//  - LIVEAVATAR_STT         speech recognition provider (deepgram | assembly_ai | gladia | elevenlabs; default: LiveAvatar picks)
//  - LIVEAVATAR_MAX_SECONDS longest session outside sandbox (default 900; each minute uses credits)
// Azure:
//  - AZURE_SPEECH_RESOURCE  the AI Services / Foundry resource name (default: ANTHROPIC_FOUNDRY_RESOURCE)
//  - AZURE_SPEECH_REGION    its region (default swedencentral; it must offer the real-time avatar)
//  - AZURE_SPEECH_KEY       its key (default: ANTHROPIC_FOUNDRY_API_KEY, the same resource). Without a key, Microsoft
//                           Entra ID (managed identity on Azure, `az login` locally; needs a role such as Foundry User).
//  - AZURE_AVATAR_CHARACTER / AZURE_AVATAR_STYLE   the stock avatar (default lori / formal; some avatars have no style: set it to "")
//  - AZURE_AVATAR_PHOTO_MODEL  "vasa-1" or "vasa-2" for a photo avatar (head and shoulders, e.g. george with vasa-2);
//                           empty for the full-length stock avatars
//  - AZURE_AVATAR_VOICE_EN / AZURE_AVATAR_VOICE_ES the neural voice per language (pick one that suits the avatar)
//  - AZURE_AVATAR_BACKGROUND background colour #RRGGBBAA (default: the service's)
const LIVEAVATAR_API = 'https://api.liveavatar.com/v1';
const SANDBOX_AVATAR = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';   // "Wayne", the only avatar sandbox allows
const AZURE_MAX_SECONDS = 1800;   // the service closes real-time avatar connections after 30 minutes

export class AvatarError extends Error { constructor(msg, status = 503) { super(msg); this.status = status; } }
const UNAVAILABLE = 'The video avatar is not available right now. You can practise by text instead.';

const provider = () => ((process.env.AVATAR_PROVIDER || 'liveavatar').toLowerCase() === 'azure' ? 'azure' : 'liveavatar');

function azureCfg() {
  const env = process.env;
  const resource = env.AZURE_SPEECH_RESOURCE || env.ANTHROPIC_FOUNDRY_RESOURCE || '';
  const sameAsFoundry = !env.AZURE_SPEECH_RESOURCE || env.AZURE_SPEECH_RESOURCE === env.ANTHROPIC_FOUNDRY_RESOURCE;
  return {
    resource,
    region: env.AZURE_SPEECH_REGION || 'swedencentral',
    key: env.AZURE_SPEECH_KEY || (sameAsFoundry ? env.ANTHROPIC_FOUNDRY_API_KEY : '') || '',
    character: env.AZURE_AVATAR_CHARACTER || 'lori',
    style: env.AZURE_AVATAR_STYLE ?? (env.AZURE_AVATAR_CHARACTER ? '' : 'formal'),
    voice: { en: env.AZURE_AVATAR_VOICE_EN || 'en-US-AvaNeural', es: env.AZURE_AVATAR_VOICE_ES || 'es-ES-ElviraNeural' },
    background: env.AZURE_AVATAR_BACKGROUND || '',
    photoModel: env.AZURE_AVATAR_PHOTO_MODEL || '',
  };
}

export function avatarConfig() {
  if (provider() === 'azure') {
    const c = azureCfg();
    return { provider: 'azure', enabled: !!c.resource, sandbox: false, avatarId: `${c.character}${c.style ? '/' + c.style : ''}` };
  }
  const sandbox = process.env.LIVEAVATAR_SANDBOX === '1';
  const avatarId = sandbox ? SANDBOX_AVATAR : (process.env.LIVEAVATAR_AVATAR_ID || '');
  return { provider: 'liveavatar', enabled: !!process.env.LIVEAVATAR_API_KEY && !!avatarId, sandbox, avatarId };
}

// What the browser needs to run one practice conversation with the avatar.
export async function avatarSession({ lang = 'en', maxSeconds = 600 } = {}) {
  const cfg = avatarConfig();
  if (!cfg.enabled) throw new AvatarError('The video avatar is not set up on this server.');
  return cfg.provider === 'azure' ? azureSession(lang, maxSeconds) : liveAvatarSession(cfg, lang, maxSeconds);
}

// LiveAvatar: a session token. No context is given, so LiveAvatar's own assistant has nothing to say (restricted
// mode): it only transcribes the learner and speaks the text we send.
async function liveAvatarSession(cfg, lang, wanted) {
  // Sandbox allows 60 s at most; in production the visit length decides, capped by LIVEAVATAR_MAX_SECONDS (default 15 min).
  const maxSeconds = cfg.sandbox ? 60 : Math.min(wanted, Number(process.env.LIVEAVATAR_MAX_SECONDS) || 900);
  const r = await fetch(`${LIVEAVATAR_API}/sessions/token`, {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.LIVEAVATAR_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      mode: 'FULL', avatar_id: cfg.avatarId, is_sandbox: cfg.sandbox,
      avatar_persona: {
        language: lang === 'es' ? 'es' : 'en',
        ...(process.env.LIVEAVATAR_STT ? { stt_config: { provider: process.env.LIVEAVATAR_STT } } : {}),
      },
      max_session_duration: maxSeconds,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.data?.session_token) {
    console.error('LiveAvatar token failed', r.status, j.code, j.message);
    throw new AvatarError(UNAVAILABLE);
  }
  return { provider: 'liveavatar', token: j.data.session_token, sessionId: j.data.session_id, sandbox: cfg.sandbox, maxSeconds };
}

// Azure: a 10-minute Speech token (also used for the learner's speech recognition) and the TURN relay details for
// the WebRTC connection that carries the avatar's video and voice.
let credential;
async function azureSpeechToken(c) {
  const headers = { 'content-length': '0' };
  if (c.key) headers['Ocp-Apim-Subscription-Key'] = c.key;
  else {
    if (!credential) {
      const { DefaultAzureCredential } = await import('@azure/identity');
      credential = new DefaultAzureCredential(process.env.AZURE_CLIENT_ID ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID } : undefined);
    }
    headers.authorization = `Bearer ${(await credential.getToken('https://cognitiveservices.azure.com/.default')).token}`;
  }
  const r = await fetch(`https://${c.resource}.cognitiveservices.azure.com/sts/v1.0/issueToken`, { method: 'POST', headers });
  if (!r.ok) { console.error('Azure Speech token failed', r.status, (await r.text().catch(() => '')).slice(0, 200)); throw new AvatarError(UNAVAILABLE); }
  return r.text();
}

export async function avatarToken() {
  if (provider() !== 'azure') throw new AvatarError('Not used with this avatar provider.', 400);
  return { token: await azureSpeechToken(azureCfg()) };
}

async function azureSession(lang, wanted) {
  const c = azureCfg();
  const token = await azureSpeechToken(c);
  const r = await fetch(`https://${c.region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`, { headers: { authorization: `Bearer ${token}` } });
  const ice = await r.json().catch(() => null);
  if (!r.ok || !ice?.Urls) { console.error('Azure avatar relay token failed', r.status); throw new AvatarError(UNAVAILABLE); }
  const es = lang === 'es';
  return {
    provider: 'azure', token, region: c.region,
    ice: { urls: ice.Urls, username: ice.Username, credential: ice.Password },
    character: c.character, style: c.style, background: c.background, photoModel: c.photoModel,
    voice: es ? c.voice.es : c.voice.en, sttLang: es ? 'es-ES' : 'en-US',
    maxSeconds: Math.min(wanted, AZURE_MAX_SECONDS), sandbox: false,
  };
}
