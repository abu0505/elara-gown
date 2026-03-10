import fs from 'fs';
import * as cheerio from 'cheerio';

async function checkUrl(url) {
  try {
    console.log(`URL: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Schema json extraction
    const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    let products = [];
    while ((match = regex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data['@type'] === 'Product' || (Array.isArray(data) && data[0] && data[0]['@type'] === 'Product')) {
          products.push(data);
        }
      } catch (e) {}
    }
    
    if (products.length > 0) {
      const p = Array.isArray(products[0]) ? products[0][0] : products[0];
      console.log(`Name: ${p.name}`);
      console.log(`Desc: ${p.description ? p.description.slice(0, 50) : ''}`);
      if (p.offers && p.offers.price) console.log(`Price: ${p.offers.price}`);
      else console.log(`Price: ${JSON.stringify(p.offers)}`);
    } else {
      console.log('No Product Schema found.');
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

async function run() {
  await checkUrl('https://www.biba.in/pink-poly-cotton-anarkali-printed-kurta-palazzo-suit-set/SKDBNDJ8993AW23PNK.html');
  await checkUrl('https://aashniandco.com/sheetal-batra-daisy-ivory-patra-embroidery-gharara-set-stbrangz23001.html');
}

run();
