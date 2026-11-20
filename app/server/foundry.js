// Claude on Microsoft Foundry.
//  - ANTHROPIC_FOUNDRY_API_KEY set (Vercel): the SDK sends the Foundry key; nothing else is needed.
//  - Not set (local): Microsoft Entra ID via DefaultAzureCredential, i.e. your `az login`.

import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';

export const MODELS = {
  main: process.env.MODEL_MAIN || 'claude-sonnet-5-5',   // role-play, feedback, module builder, pre-check
  fast: process.env.MODEL_FAST || 'claude-haiku-5-5',    // quiz explanations, small tasks
};

let client;
export async function foundryClient() {
  if (!client) {
    const resource = process.env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (!resource) throw new Error('ANTHROPIC_FOUNDRY_RESOURCE is not set');
    if (process.env.ANTHROPIC_FOUNDRY_API_KEY) {
      client = new AnthropicFoundry({ resource, maxRetries: 4 }); // the SDK reads ANTHROPIC_FOUNDRY_API_KEY itself
    } else {
      const { DefaultAzureCredential, getBearerTokenProvider } = await import('@azure/identity');
      const credential = new DefaultAzureCredential(
        process.env.AZURE_CLIENT_ID ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID } : undefined);
      client = new AnthropicFoundry({
        resource,
        maxRetries: 4,   // parallel lesson writing can briefly hit the per-minute limit; the SDK backs off
        azureADTokenProvider: getBearerTokenProvider(credential, 'https://ai.azure.com/.default'),
      });
    }
  }
  return client;
}

// Cheapest possible end-to-end check: a few tokens on Haiku.
export async function ping() {
  const started = Date.now();
  const msg = await (await foundryClient()).messages.create({
    model: MODELS.fast,
    max_tokens: 20,
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
  });
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  return { model: msg.model, reply: text, ms: Date.now() - started };
}
