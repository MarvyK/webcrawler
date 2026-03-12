#!/usr/bin/env node
/**
 * Web Crawler Server
 * Run: node server.js
 * Then open: http://localhost:3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3001;

function extractLinks(html, pageUrl) {
  const links = [];
  const regex = /href=["']([^"'#][^"']*?)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], pageUrl).href;
      links.push(resolved);
    } catch {}
  }
  return links;
}

function normalise(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

async function crawl(startUrl, maxDepth, onProgress) {
  let base;
  try {
    base = new URL(startUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  const visited = new Set();
  const found = [];
  const queue = [{ url: base.href, depth: 0 }];
  let crawled = 0;

  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    const clean = normalise(url);
    if (!clean || visited.has(clean) || depth > maxDepth) continue;
    visited.add(clean);

    onProgress({ type: 'crawling', url: clean, depth, queued: queue.length, crawled });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(clean, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebCrawlerUI/1.0)' },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);

      const ct = res.headers.get('content-type') || '';
      found.push({ url: clean, status: res.status, type: ct.includes('text/html') ? 'html' : 'asset' });
      crawled++;

      if (!ct.includes('text/html')) continue;

      const html = await res.text();
      const links = extractLinks(html, clean);

      for (const link of links) {
        const norm = normalise(link);
        if (norm && new URL(norm).hostname === base.hostname && !visited.has(norm)) {
          queue.push({ url: norm, depth: depth + 1 });
        }
      }

      onProgress({ type: 'found', url: clean, status: res.status, depth, queued: queue.length, crawled, total: found.length });
    } catch (err) {
      onProgress({ type: 'error', url: clean, error: err.message, queued: queue.length, crawled });
    }
  }

  onProgress({ type: 'done', urls: found, total: found.length });
  return found;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve UI
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // SSE crawl endpoint
  if (req.method === 'POST' && req.url === '/crawl') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const { url, depth } = JSON.parse(body);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      try {
        await crawl(url, depth || 3, send);
      } catch (err) {
        send({ type: 'error', error: err.message });
      }
      res.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ Crawler UI running at http://localhost:${PORT}\n`);
  console.log('   Open that URL in your browser to start crawling.\n');
  console.log('   Press Ctrl+C to stop.\n');
});
