const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/scrape-tracking', async (req, res) => {
  const url = req.body.url;
  const domains = req.body.domains;
  if (!url || !Array.isArray(domains) || domains.length === 0) {
    return res.status(400).json({ error: 'Provide url and domains array' });
  }
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  const trackedRequests = [];

  page.on('requestfinished', request => {
    try {
      const requestUrl = new URL(request.url());
      if (domains.some(domain => requestUrl.hostname === domain || requestUrl.hostname.endsWith('.' + domain))) {
        trackedRequests.push({
          url: request.url(),
          hostname: requestUrl.hostname,
          method: request.method(),
          resourceType: request.resourceType(),
          postData: request.postData()
        });
      }
    } catch (e) {
      // Just skip malformed URLs
    }
  });

  try {
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(res => setTimeout(res, 5000));
    await browser.close();
    res.json(trackedRequests);
  } catch (error) {
    await browser.close();
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
