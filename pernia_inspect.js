import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

// Inspect a single product detail page from Pernia's
const productUrl = 'https://www.perniaspopupshop.com/kalighata-gold-net-raw-silk-lehenga-set-kgtc092366.html';

async function inspectProduct() {
  const res = await fetch(productUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  const out = [];
  const log = (...a) => { out.push(a.join(' ')); };
  
  // JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    const c = $(el).html() || '';
    if (c.includes('Product') || c.includes('name')) {
      log(`\n=== JSON-LD ${i} ===`);
      log(c.substring(0, 3000));
    }
  });
  
  // Product name/title
  log('\n=== Title/Name ===');
  log('h1:', $('h1').first().text().trim());
  log('.ProductName:', $('[class*="ProductName"]').first().text().trim());
  log('.product-name:', $('[class*="product-name"]').first().text().trim());
  
  // Designer
  log('\n=== Designer ===');
  $('[class*="designer"], [class*="Designer"]').each((i, el) => {
    const t = $(el).text().trim();
    if (t) log(`designer ${i} (${$(el).attr('class')}): ${t.substring(0, 100)}`);
  });
  
  // Price
  log('\n=== Price ===');
  $('[class*="rice"], [class*="MRP"]').each((i, el) => {
    const t = $(el).text().trim();
    if (t) log(`price ${i} (${$(el).attr('class')}): ${t.substring(0, 100)}`);
  });
  
  // Description
  log('\n=== Description ===');
  $('[class*="escription"], [class*="detail"], [class*="Detail"]').each((i, el) => {
    const t = $(el).text().trim();
    if (t.length > 20 && t.length < 2000) log(`desc ${i} (${$(el).attr('class')}): ${t.substring(0, 500)}`);
  });
  
  // Specifications / Features
  log('\n=== Specs/Features ===');
  $('[class*="spec"], [class*="Spec"], [class*="feature"], [class*="Feature"], [class*="attribute"], [class*="Attribute"]').each((i, el) => {
    const t = $(el).text().trim();
    if (t.length > 5) log(`spec ${i} (${$(el).attr('class')}): ${t.substring(0, 500)}`);
  });
  
  // Images
  log('\n=== Images ===');
  $('img[src*="catalog/product"], img[data-src*="catalog/product"]').each((i, el) => {
    log(`img ${i}: src=${$(el).attr('src')}, data-src=${$(el).attr('data-src')}, alt=${$(el).attr('alt')}`);
  });
  
  // Check meta og:image
  const ogImage = $('meta[property="og:image"]').attr('content');
  log('og:image:', ogImage);
  
  // Product gallery container
  log('\n=== Gallery/Slider ===');
  $('[class*="gallery"], [class*="Gallery"], [class*="slider"], [class*="Slider"], [class*="carousel"], [class*="Carousel"]').each((i, el) => {
    log(`gallery ${i} (${$(el).attr('class')}): children=${$(el).children().length}`);
    $(el).find('img').each((j, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src) log(`  img: ${src}`);
    });
  });
  
  // Check window.__PRELOADED_STATE__ or similar
  log('\n=== Script data ===');
  $('script').each((i, el) => {
    const c = $(el).html() || '';
    if (c.includes('PRELOADED') || c.includes('__STATE__') || c.includes('window.__') || c.includes('productData') || c.includes('product_data')) {
      log(`script ${i}: ${c.substring(0, 1000)}`);
    }
  });
  
  // Check for initial state / redux state
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*<\/script>/s);
  if (stateMatch) {
    log('\n=== __INITIAL_STATE__ ===');
    log(stateMatch[1].substring(0, 2000));
  }
  
  // Check for any product JSON in script tags
  $('script').each((i, el) => {
    const c = $(el).html() || '';
    if (c.includes('"sku"') || c.includes('"product_id"') || c.includes('"entity_id"')) {
      log(`\nScript with SKU/ID data (${i}): ${c.substring(0, 1500)}`);
    }
  });

  fs.writeFileSync('pernia_product_inspect.txt', out.join('\n'));
  console.log('Written to pernia_product_inspect.txt');
}

inspectProduct().catch(console.error);
