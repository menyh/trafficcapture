const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

app.post('/scrape-tracking', async (req, res) => {
  const url = req.body.url;
  const domains = Array.isArray(req.body.domains) ? req.body.domains : [];
  if (!url || domains.length === 0) {
    return res.status(400).json({ error: 'url and domains array are required' });
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  const matchedRequests = [];

  page.on('requestfinished', async (request) => {
    // Get response object
    const response = request.response();
    if (!response) return;

    try {
      const reqUrl = new URL(request.url());
      if (
        domains.some(
          domain =>
            reqUrl.hostname === domain || reqUrl.hostname.endsWith('.' + domain)
        )
      ) {
        // Try to get response body as text, but handle errors
        let responseBody = null;
        try {
          responseBody = await response.text();
        } catch (err) {
          responseBody = '[could not get body]';
        }

        matchedRequests.push({
          url: request.url(),
          method: request.method(),
          requestHeaders: request.headers(),
          requestBody: request.postData(),
          responseHeaders: response.headers(),
          status: response.status(),
          responseBody,
          resourceType: request.resourceType()
        });
      }
    } catch {}
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    // Simulate some activity
    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise(res => setTimeout(res, 5000));
    await browser.close();
    res.json(matchedRequests);
  } catch (error) {
    await browser.close();
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

