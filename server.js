const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/scrape-tracking', async (req, res) => {
  const url = req.body.url;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  const trackedRequests = [];

  page.on('requestfinished', request => {
    const requestUrl = request.url();
    if (requestUrl.includes('facebook.com/tr?')) {
      trackedRequests.push({ type: 'facebook', url: requestUrl, method: request.method(), postData: request.postData() });
    }
    if (requestUrl.includes('googletagmanager.com/gtm.js')) {
      trackedRequests.push({ type: 'gtm', url: requestUrl, method: request.method() });
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(res => setTimeout(res, 5000));
    await browser.close();
    res.json(trackedRequests);
  } catch (error) {
    await browser.close();
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
