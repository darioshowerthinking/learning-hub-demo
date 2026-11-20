// Vercel entry point: Vercel finds an Express app in a root server.js and runs it as one function.
// Static files (public/) are served by Vercel's CDN, not by Express.
import express from 'express'; // eslint-disable-line no-unused-vars -- the import is how Vercel detects Express
import app from './server/app.js';

export default app;
