/**
 * House of Indya — Bulk Scraper
 * Scrapes product data from collection pages and appends to new_prod.csv
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

const COLLECTIONS = [
  {
    url: 'https://www.houseofindya.com/women-clothing/anakali/cat',
    category: 'Anarkali Sets',
    minProducts: 45,
  },
  {
    url: 'https://www.houseofindya.com/women-lehenga-set/cat',
    category: 'Lehenga',
    minProducts: 45,
  }
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const DELAY = 500; // ms
const CSV_FILE = 'new_prod.csv';

// ──────────────────────── COLOR MAP ────────────────────────
const COLOR_HEX = {
  'midnight blue':'#191970','sky blue':'#87CEEB','royal blue':'#4169E1','baby blue':'#89CFF0',
  'navy blue':'#000080','powder blue':'#B0E0E6','steel blue':'#4682B4','teal blue':'#367588',
  'ice blue':'#99E5FF','cobalt blue':'#0047AB',
  'olive green':'#808000','emerald green':'#50C878','sage green':'#BCB88A','mint green':'#98FF98',
  'forest green':'#228B22','lime green':'#32CD32','sea green':'#2E8B57','bottle green':'#006A4E',
  'rose gold':'#B76E79','old rose':'#C08081','dusty rose':'#DCAE96',
  'hot pink':'#FF69B4','baby pink':'#F4C2C2','blush pink':'#F9BFC4','rani pink':'#E52B76','rose':'#FF007F',
  'champagne':'#F7E7CE','off white':'#FAF9F6','burnt orange':'#CC5500',
  'wine':'#722F37','rust':'#B7410E','mustard':'#FFDB58','coral':'#FF7F50',
  'burgundy':'#800020','fuchsia':'#FF00FF','magenta':'#FF0055','lilac':'#C8A2C8',
  'lavender':'#E6E6FA','mauve':'#E0B0FF','plum':'#8E4585','orchid':'#DA70D6',
  'turquoise':'#40E0D0','cyan':'#00FFFF','aqua':'#00FFFF',
  'taupe':'#483C32','charcoal':'#36454F','pewter':'#8F9497',
  'black':'#000000','white':'#FFFFFF','red':'#FF0000','blue':'#0000FF',
  'green':'#008000','yellow':'#FFFF00','orange':'#FFA500','pink':'#FFC0CB',
  'purple':'#800080','grey':'#808080','gray':'#808080','brown':'#A52A2A',
  'beige':'#F5F5DC','ivory':'#FFFFF0','cream':'#FFFDD0','gold':'#FFD700',
  'silver':'#C0C0C0','peach':'#FFDAB9','maroon':'#800000','teal':'#008080',
  'indigo':'#4B0082','tan':'#D2B48C','khaki':'#F0E68C','salmon':'#FA8072',
  'copper':'#B87333','bronze':'#CD7F32','nude':'#E3BC9A',
};

const COLOR_NAMES = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);

function detectColor(name, colorStr) {
  if (colorStr) {
    const lower = colorStr.toLowerCase().trim();
    for (const c of COLOR_NAMES) {
      if (lower.includes(c)) return { name: c.charAt(0).toUpperCase() + c.slice(1), hex: COLOR_HEX[c] };
    }
  }
  if (name) {
    const lower = name.toLowerCase();
    for (const c of COLOR_NAMES) {
      const re = new RegExp(`\\b${c}\\b`, 'i');
      if (re.test(lower)) return { name: c.charAt(0).toUpperCase() + c.slice(1), hex: COLOR_HEX[c] };
    }
  }
  return { name: '', hex: '' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeCSV(str) {
  if (!str) return '""';
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

async function collectProductUrls(collectionUrl, minProducts) {
  try {
    const res = await fetch(collectionUrl, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const urls = [];
    $('#listData li, ul#listData > li, li[data-url]').each((_, el) => {
      let url = $(el).attr('data-url');
      if (!url) url = $(el).find('a').first().attr('href');
      
      if (url && !url.includes('javascript') && !url.includes('#')) {
        const fullUrl = url.startsWith('http') ? url : `https://www.houseofindya.com${url}`;
        if (!urls.includes(fullUrl)) urls.push(fullUrl);
      }
    });
    
    return urls.slice(0, Math.max(minProducts, 50));
  } catch (e) {
    console.error(`Error fetching collection: ${e.message}`);
    return [];
  }
}

async function scrapeProduct(productUrl, category) {
  const res = await fetch(productUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // JSON-LD structured data
  let jsonLd = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type'] === 'Product') {
        jsonLd = data;
      }
    } catch {}
  });

  const sku = jsonLd.sku || '';
  const salePrice = jsonLd.offers?.price || 0;
  let originalPrice = salePrice;

  // Description and Specs
  // Indya puts description in JSON-LD usually as HTML
  let rawDesc = jsonLd.description || '';
  let colorStr = '', fabric = '', neckline = '', sleeves = '', work = '';
  
  if (rawDesc.includes('Color:')) {
    const m = rawDesc.match(/Color:(.*?)</);
    if (m) colorStr = m[1].trim();
  }
  if (rawDesc.includes('Fabric:')) {
    const m = rawDesc.match(/Fabric:(.*?)</);
    if (m) fabric = m[1].trim();
  }
  if (rawDesc.includes('Neckline:')) {
    const m = rawDesc.match(/Neckline:(.*?)</);
    if (m) neckline = m[1].trim();
  }
  if (rawDesc.includes('Sleeves:')) {
    const m = rawDesc.match(/Sleeves:(.*?)</);
    if (m) sleeves = m[1].trim();
  }
  if (rawDesc.includes('Work:')) {
    const m = rawDesc.match(/Work:(.*?)</);
    if (m) work = m[1].trim();
  }
  
  // Clean up description if it's HTML
  let description = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  if (description.startsWith('Main Color:')) {
    description = `Beautiful ${fabric || 'outfit'} with ${work || 'embroidery'} and ${sleeves || ''}. ${description}`; 
  }

  // Name from page
  let name = jsonLd.name || $('h1').first().text().replace(sku, '').replace('-', '').trim();
  
  // Extract images
  const thumbnail = jsonLd.image || '';
  const galleryImages = [];
  
  // House of Indya stores images in JS or data attributes
  let imgBase = thumbnail;
  // Let's generate gallery from thumbnail if possible. Thumbnail looks like .../1.jpg
  if (imgBase && imgBase.endsWith('1.jpg')) {
    galleryImages.push(imgBase.replace('1.jpg', '2.jpg'));
    galleryImages.push(imgBase.replace('1.jpg', '3.jpg'));
    galleryImages.push(imgBase.replace('1.jpg', '4.jpg'));
    galleryImages.push(imgBase.replace('1.jpg', '5.jpg'));
  }
  
  // Detect colors
  const finalColor = detectColor(name, colorStr);

  // Price from DOM if json-ld lacks original price
  const mrpText = $('#mrp, .mrp').text().replace(/[^0-9.]/g, '');
  if (mrpText) originalPrice = parseFloat(mrpText);
  if (!originalPrice || originalPrice < salePrice) originalPrice = salePrice * 2; // rough fallback if original not found
  
  const sp = parseFloat(salePrice) || 0;
  const op = parseFloat(originalPrice) || sp;
  const discount = op > 0 ? Math.round(((op - sp) / op) * 100) : 0;
  
  // Occasion
  let occasion = 'Festive';
  const descLower = (description + ' ' + name).toLowerCase();
  if (descLower.includes('bridal') || descLower.includes('wedding')) occasion = 'Wedding';
  else if (descLower.includes('cocktail') || descLower.includes('party')) occasion = 'Party';
  
  let brandName = "House of Indya";
  let finalName = name.startsWith(brandName) ? name : `${brandName} - ${name}`;

  return {
    name: finalName,
    description: description,
    material: fabric || 'Georgette, Net',
    fit_type: 'Regular',
    occasion: occasion,
    care_instructions: 'Dry clean only',
    category: category,
    base_price: op,
    sale_price: sp || op,
    discount_percent: discount,
    is_active: 'true',
    is_featured: 'true',
    is_new_arrival: 'true',
    is_best_seller: 'false',
    color_name: finalColor.name || colorStr,
    color_hex: finalColor.hex || '#FFFFFF',
    size: 'M',
    stock_qty: 15,
    thumbnail_url: thumbnail,
    gallery_urls: galleryImages.join(', '),
  };
}

// ──────────────────── MAIN ────────────────────
async function main() {
  console.log('======================================================================');
  console.log("  House of Indya — Bulk Scraper");
  console.log('======================================================================');
  
  const allProducts = [];
  
  for (const col of COLLECTIONS) {
    console.log(`\nFetching collection: ${col.category}`);
    console.log(`  URL: ${col.url}`);
    
    let urls = await collectProductUrls(col.url, col.minProducts);
    urls = urls.slice(0, col.minProducts); // Ensure we only do ~45-50
    console.log(`  Found ${urls.length} product URLs`);
    
    let success = 0, failed = 0;
    for (let i = 0; i < urls.length; i++) {
      process.stdout.write(`\r  Scraping [${i + 1}/${urls.length}]... `);
      try {
        const product = await scrapeProduct(urls[i], col.category);
        if (product.name && product.thumbnail_url) {
          allProducts.push(product);
          success++;
        } else {
          failed++;
        }
        await sleep(DELAY);
      } catch (e) {
        failed++;
      }
    }
    console.log(`\n  Done: ${success} success, ${failed} failed`);
  }
  
  console.log(`\n======================================================================`);
  console.log(`Total House of Indya products scraped: ${allProducts.length}`);
  
  let existingLines = 0;
  if (fs.existsSync(CSV_FILE)) {
    const existing = fs.readFileSync(CSV_FILE, 'utf-8');
    existingLines = existing.trim().split('\n').length - 1;
    console.log(`Existing products in ${CSV_FILE}: ${existingLines}`);
  }
  
  const csvRows = allProducts.map(p => {
    return [
      escapeCSV(p.name), escapeCSV(p.description), escapeCSV(p.material),
      escapeCSV(p.fit_type), escapeCSV(p.occasion), escapeCSV(p.care_instructions),
      escapeCSV(p.category), p.base_price, p.sale_price, p.discount_percent,
      p.is_active, p.is_featured, p.is_new_arrival, p.is_best_seller,
      escapeCSV(p.color_name), escapeCSV(p.color_hex), escapeCSV(p.size),
      p.stock_qty, escapeCSV(p.thumbnail_url), escapeCSV(p.gallery_urls),
    ].join(',');
  });
  
  if (csvRows.length > 0) {
    fs.appendFileSync(CSV_FILE, '\n' + csvRows.join('\n'));
    console.log(`Appended ${csvRows.length} products to ${CSV_FILE}`);
    console.log(`Total products now: ${existingLines + csvRows.length}`);
  }
}

main().catch(console.error);
