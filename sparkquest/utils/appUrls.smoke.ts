import { resolveAppUrl } from './appUrls.ts';

const assertEqual = (actual: string, expected: string, message: string) => {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, received ${actual}`);
};

const defaults = {
  localUrl: 'http://127.0.0.1:5174',
  productionUrl: 'https://sparkquest-makerlab.vercel.app',
};

assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'localhost' }),
  'http://127.0.0.1:5174',
  'local development should use the local app'
);
assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'app.example.com' }),
  'https://sparkquest-makerlab.vercel.app',
  'production should use the production app'
);
assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'app.example.com', configuredUrl: 'http://localhost:5174' }),
  'https://sparkquest-makerlab.vercel.app',
  'production must reject a configured localhost URL'
);
assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'app.example.com', configuredUrl: 'https://learn.example.com/' }),
  'https://learn.example.com',
  'production should accept an explicit public URL'
);
assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'localhost', configuredUrl: 'https://preview.example.com' }),
  'https://preview.example.com',
  'local development should respect an explicit public preview URL'
);
assertEqual(
  resolveAppUrl({ ...defaults, currentHostname: 'app.example.com', configuredUrl: 'javascript:alert(1)' }),
  'https://sparkquest-makerlab.vercel.app',
  'unsafe protocols should fall back safely'
);

console.log('Standalone SparkQuest app URL smoke: 6 assertions passed.');
