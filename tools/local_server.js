const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number.parseInt(process.argv[2] || '8080', 10);
const rootDir = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.txt': 'text/plain; charset=utf-8'
};

function getSafePath(urlPathname) {
    let requestedPath = decodeURIComponent(urlPathname || '/');
    if (requestedPath === '/') requestedPath = '/index.html';
    const cleanedPath = requestedPath.replace(/^\/+/, '');
    const absPath = path.resolve(rootDir, cleanedPath);
    if (!absPath.startsWith(path.resolve(rootDir))) return null;
    return absPath;
}

function sendNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
}

const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const absPath = getSafePath(reqUrl.pathname);
    if (!absPath) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(absPath, (statErr, stats) => {
        if (statErr || !stats) {
            sendNotFound(res);
            return;
        }

        let filePath = absPath;
        if (stats.isDirectory()) {
            filePath = path.join(absPath, 'index.html');
        }

        fs.readFile(filePath, (readErr, data) => {
            if (readErr) {
                sendNotFound(res);
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.on('error', (err) => {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
});

server.listen(port, () => {
    console.log(`Serving ${rootDir}`);
    console.log(`Open: http://localhost:${port}/tools/story-flow.html`);
});

