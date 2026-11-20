// Local launcher: `npm start` / `npm run dev`. On Vercel the app is imported from ../server.js instead.
import app from './app.js';

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Zenetic Learning Hub on http://localhost:${port}`));
