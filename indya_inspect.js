import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const url = 'https://www.houseofindya.com/women-clothing/anakali/cat';

async function inspectCards() {
  const output = [];
  const log = (...args) => { output.push(args.join(' ')); console.log(...args); };

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  log('Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // Dump product cards HTML
  const cards = $('li[data-url], .prod-li, .product-item, [class*="product"]');
  log('Total Product elements based on generic selectors:', cards.length);

  // More specific search for House of Indya product list
  const listItems = $('#listData li, ul#listData > li, .catgList li');
  log('List items found:', listItems.length);

  if (listItems.length > 0) {
    log('\n=== FIRST ITEM OUTER HTML (1000 chars) ===');
    log($.html(listItems.first()).substring(0, 1000));
    
    log('\n=== ALL ITEMS TEXT & LINKS ===');
    listItems.slice(0, 5).each((i, el) => {
      const card = $(el);
      const link = card.attr('data-url') || card.find('a').first().attr('href') || '';
      const dataId = card.attr('data-id') || '';
      const allText = card.text().replace(/\s+/g, ' ').trim();
      log(`\n[${i}] ID: ${dataId} Link: ${link}`);
      log(`    Text: ${allText}`);
    });
  }
  
  // Find pagination or infinite scroll data
  log('\n=== SCRIPT TAGS WITH PRODUCT DATA ===');
  $('script').each((i, el) => {
    const content = $(el).html() || '';
    if (content.includes('dataLayer') || content.includes('product') || content.includes('init') || content.includes('var pwa')) {
      if (content.length > 50 && content.length < 5000) {
        log(`\nScript index ${i} length ${content.length}:`);
        log(content.substring(0, 300));
      } else if (content.length >= 5000) {
        log(`\nScript index ${i} length ${content.length} (LARGE):`);
        log(content.substring(0, 300) + '...');
      }
    }
  });

  // Check a product detail page
  let firstLink = listItems.first().attr('data-url') || listItems.first().find('a').first().attr('href');
  if (!firstLink) {
    firstLink = $('a[href*="/product/"], a[href*="-prt-"]').first().attr('href');
  }

  if (firstLink) {
    const productUrl = firstLink.startsWith('http') ? firstLink : `https://www.houseofindya.com${firstLink}`;
    log('\n\n=== PRODUCT DETAIL PAGE ===');
    log('URL:', productUrl);
    
    const prodRes = await fetch(productUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const prodHtml = await prodRes.text();
    const $p = cheerio.load(prodHtml);
    
    // Title
    log('\n--- Title ---');
    log('h1:', $p('h1').first().text().trim());

    // Price
    log('\n--- Price ---');
    log('#mrp / .mrp:', $p('#mrp, .mrp, [class*="price"]').first().text().trim());
    log('.dis-price:', $p('.dis-price, [class*="discount-price"]').first().text().trim());
    
    // Desc
    log('\n--- Description ---');
    log('#desc, .desc:', $p('#desc, .desc, .pro-desc, [class*="description"]').text().substring(0, 300).trim());
    
    // Details/Specs
    log('\n--- Details list ---');
    $p('ul.prodDescList li, .prod-desc-list li, [class*="detail"] li').each((i, el) => {
      log(`  ${i}:`, $p(el).text().trim());
    });

    // Images
    log('\n--- Images ---');
    $p('img').each((i, el) => {
      const src = $p(el).attr('data-original') || $p(el).attr('src') || '';
      if (src && (src.includes('product') || src.includes('model') || src.includes('thumb'))) {
        log(`  ${i}: ${src}`);
      }
    });

    // JSON-LD
    $p('script[type="application/ld+json"]').each((i, el) => {
      log(`\nJSON-LD Product data:`);
      log($p(el).html().substring(0, 1000));
    });
  }
  
  fs.writeFileSync('indya_inspect_output.txt', output.join('\n'));
  log('\n\nSaved to indya_inspect_output.txt');
}

inspectCards().catch(console.error);
