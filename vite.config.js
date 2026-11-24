import { defineConfig } from 'vite';

/* paylaşım önizlemesi için sitenin tam adresi (og:image tam adres ister).
   Cloudflare build'i dal adını WORKERS_CI_BRANCH ile verir: master → canlı adres, diğer dallar → kendi önizleme adresi. */
const HOST = '21gram-qr-menu.abdulkadirozenc-freelance-44e.workers.dev';
const branch = process.env.WORKERS_CI_BRANCH || 'master';
const SITE = 'https://' + (branch === 'master' ? '' : branch.toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-') + HOST;

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  esbuild: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  server: { port: 5173 },
  plugins: [{ name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE%', SITE) }],
});
