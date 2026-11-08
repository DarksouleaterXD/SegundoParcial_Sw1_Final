import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

const backend = process.env.CLASSFORGE_API_ORIGIN ?? 'http://127.0.0.1:8082';

// Project IDs come from the authenticated API. Serve the same static editor
// entry at each project URL, which stays visible to browser history.
function workspaceEntry(req, _res, next) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (/^\/projects\/[^/]+\/?$/.test(url.pathname)) {
    req.url = '/workspace/' + url.search;
  }
  next();
}

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [
    vue({ template: { compilerOptions: { isCustomElement: (tag) => /^(cf-|app-)/.test(tag) } } }),
  ],
  server: { host: '127.0.0.1', port: 4200 },
  build: { format: 'directory' },
  vite: {
    plugins: [
      {
        name: 'orbita-workspace-entry',
        configureServer(server) {
          server.middlewares.use(workspaceEntry);
        },
        configurePreviewServer(server) {
          server.middlewares.use(workspaceEntry);
        },
      },
    ],
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/ws': { target: backend, changeOrigin: true, ws: true },
      },
    },
  },
});
