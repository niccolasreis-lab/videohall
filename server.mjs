import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './src/app.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3210);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const app = createApplication({
  dataDir: resolve(process.env.APP_DATA_DIR || resolve(root, 'data')),
  secureCookies: process.env.SECURE_COOKIES === 'true',
});
app.server.listen(port, host, () => {
  console.log(`VideoWall pronto: http://${host}:${port}`);
  console.log(`Player: http://${host}:${port}/player`);
  console.log('Os dados ficam no diretório local configurado. Ctrl+C para encerrar.');
});
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (closing) return;
  closing = true;
  app.server.close(() => { app.close(); process.exit(0); });
  app.server.closeIdleConnections();
});
