const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const next = require('next');

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3005', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Next 16 enumerates public/ once at boot; igSyncService rewrites /ig-testi/hl-*.jpg
// every 30 min, so those files must be served straight from disk, not by Next.
const IG_TESTI_DIR = path.join(__dirname, 'public', 'ig-testi');
const IG_TESTI_PREFIX = '/ig-testi/';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

function serveIgTesti(req, res, pathname) {
  const rel = decodeURIComponent(pathname.slice(IG_TESTI_PREFIX.length));
  const file = path.join(IG_TESTI_DIR, rel);
  if (!file.startsWith(IG_TESTI_DIR + path.sep)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.statusCode = 404; return res.end('Not found'); }
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    fs.createReadStream(file).pipe(res);
  });
}

const DEPLOY_SECRET = process.env.AUTO_DEPLOY_SECRET || 'RyITSolutionsAutoDeploy2026';

function handleDeploy(req, res) {
  const parsed = parse(req.url, true);
  const providedSecret = parsed.query.secret || req.headers['x-webhook-secret'];
  if (!providedSecret || providedSecret !== DEPLOY_SECRET) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: false, message: 'Forbidden' }));
  }
  const repoRoot = path.resolve(__dirname, '../..');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: true, message: 'Deploy triggered', repo_root: repoRoot, ts: new Date().toISOString() }));

  const { exec } = require('child_process');
  console.log(`[SELF_DEPLOY] Triggered. Working dir: ${repoRoot}`);
  // ponytail: .next di-commit sbg artifact deploy; perubahan lokalnya selalu konflik, jadi reset dulu.
  // Stash sisa source changes (fitur lokal STB) biar pull bersih, lalu pulihkan.
  const deployCmd = `git -C "${repoRoot}" checkout -- tembak-paket-app/frontend-v2/.next && git -C "${repoRoot}" stash push -u -m "auto-deploy" && git -C "${repoRoot}" pull origin main && (git -C "${repoRoot}" stash pop || true); pm2 restart rystore-backend && pm2 restart rystore-frontend`;
  exec(deployCmd, { cwd: repoRoot, shell: true }, (err, stdout, stderr) => {
    if (err) {
      console.error(`[SELF_DEPLOY] FAILED: ${err.message}`);
      if (stderr) console.error(`[SELF_DEPLOY] stderr:\n${stderr}`);
      return;
    }
    console.log(`[SELF_DEPLOY] Success. Output:\n${stdout}`);
  });
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      if (parsedUrl.pathname.startsWith(IG_TESTI_PREFIX) && (req.method === 'GET' || req.method === 'HEAD')) {
        return serveIgTesti(req, res, parsedUrl.pathname);
      }
      if (parsedUrl.pathname === '/_deploy' && (req.method === 'POST' || req.method === 'GET')) {
        return handleDeploy(req, res);
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, () => {
    console.log(`> Frontend server ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
