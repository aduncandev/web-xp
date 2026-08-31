import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Serve index.html for public subdirectory requests (e.g. /voltorb_flip/ → public/voltorb_flip/index.html).
// CRA did this automatically; Vite's SPA fallback intercepts these requests instead.
function servePublicHtml() {
  return {
    name: 'serve-public-html',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.endsWith('/')) {
          const filePath = path.join(__dirname, 'public', req.url, 'index.html');
          if (fs.existsSync(filePath)) {
            req.url = req.url + 'index.html';
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [servePublicHtml(), react()],
  resolve: {
    alias: {
      assets: path.resolve(__dirname, 'src/assets'),
      components: path.resolve(__dirname, 'src/components'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      context: path.resolve(__dirname, 'src/context'),
      WinXP: path.resolve(__dirname, 'src/WinXP'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
