# Web Crawler UI

A local web crawler that discovers all URLs on a website, with a dark terminal-style UI. No npm install required — uses only Node.js built-ins.

---

## Requirements

- Node.js 18 or higher

Check your version:

```bash
node --version
```

---

## Setup

1. Download both files into the same folder:
   - `server.js`
   - `index.html`

2. Start the server:

```bash
node server.js
```

3. Open your browser and go to:

```
http://localhost:3000
```

---

## Usage

1. Enter a target URL (e.g. `https://example.com`)
2. Set the max crawl depth using the slider (1–6)
3. Click **START CRAWL**
4. Watch URLs populate in real time

### Results

| Action         | Description                                      |
| -------------- | ------------------------------------------------ |
| **Copy all**   | Copies every discovered URL to your clipboard    |
| **Export CSV** | Downloads a CSV with URL, status code, and depth |
| Click a URL    | Copies that individual URL to clipboard          |
| Filter bar     | Filters the results list in real time            |

---

## Port already in use?

Open `server.js` and change the port near the top:

```js
const PORT = 3000; // change to 3001, 8080, etc.
```

Then restart the server and navigate to the new port.

---

## How it works

The UI (`index.html`) is served by a lightweight Node.js HTTP server (`server.js`). When you start a crawl, the browser sends a POST request to `/crawl`. The server fetches each page, parses `href` links from the HTML, and streams results back to the browser in real time using server-sent events (SSE).

Because crawling runs server-side, it bypasses the browser's CORS restrictions that would block a purely client-side crawler.

---

## Notes

- Only internal links (same hostname) are followed
- Non-HTML resources (images, PDFs, etc.) are recorded but not crawled further
- Each request has an 8-second timeout
- The crawler respects redirects automatically

---

## Files

```
├── server.js    # Node.js server + crawl logic
└── index.html   # Browser UI
```
