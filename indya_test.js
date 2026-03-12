import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const url = 'https://www.houseofindya.com/women-clothing/anakali/cat';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function testScrape() {
  const output = [];
  const log = (...a) => { output.push(a.join(' ')); console.log(...a); };

  const res = await fetch(url, { headers: HEADERS });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const urls = [];
  $('#listData li, ul#listData > li, li[data-url]').each((_, el) => {
    let u = $(el).attr('data-url');
    if (!u) u = $(el).find('a').first().attr('href');
    if (u && !u.includes('javascript') && !u.includes('#')) {
      const fullUrl = u.startsWith('http') ? u : `https://www.houseofindya.com${u}`;
      if (!urls.includes(fullUrl)) urls.push(fullUrl);
    }
  });

  log(`Testing first 5 URLs to see why they might fail...`);
  for (let i = 0; i < 5; i++) {
    const productUrl = urls[i];
    log(`\nURL: ${productUrl}`);
    try {
      const pRes = await fetch(productUrl, { headers: HEADERS });
      const pHtml = await pRes.text();
      const $p = cheerio.load(pHtml);
      
      let jsonLd = {};
      $p('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($p(el).html() || '{}');
          if (data['@type'] === 'Product') {
            jsonLd = data;
          }
        } catch {}
      });

      const sku = jsonLd.sku || '';
      let name = jsonLd.name || $p('h1').first().text().replace(sku, '').replace('-', '').trim();
      const thumbnail = jsonLd.image || '';
      
      log(`Name: '${name}'`);
      log(`Thumbnail: '${thumbnail}'`);
      
      if (!name || !thumbnail) {
        log('FAIL! Missing name or thumbnail.');
        $p('img').each((idx, el) => {
          const src = $p(el).attr('data-original') || $p(el).attr('src');
          if (src && src.includes('product')) log(`  Found img: ${src}`);
        });
      }
    } catch (e) {
      log('Error:', e.message);
    }
  }
  fs.writeFileSync('indya_test_output.txt', output.join('\n'));
}

testScrape().catch(console.error);
