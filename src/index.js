import app from './app.js';
import { init as initDb } from './db/index.js';

const port = process.env.PORT || 3000;

(async () => {
  try {
    console.log('Initializing database...');
    await initDb();
    console.log('Database initialized successfully.');

    if (process.env.NODE_ENV !== 'production') {
      app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    }

  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();
