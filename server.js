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
    headless: true // Railway runs headless
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  const matchedRequests = [];
  page.on('requestfinished', request => {
    try {
      const reqUrl = new URL(request.url());
      if (
        domains.some(
          domain =>
            reqUrl.hostname === domain || reqUrl.hostname.endsWith('.' + domain)
        )
      ) {
        matchedRequests.push({
          url: request.url(),
          method: request.method(),
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
