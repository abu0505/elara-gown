/**
 * Pernia's Pop Up Shop — Bulk Scraper
 * Scrapes product data from collection pages and appends to new_prod.csv
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// ──────────────────────── CONFIG ────────────────────────
const COLLECTIONS = [
  {
    url: 'https://www.perniaspopupshop.com/designers/kalighata?sort=new_desc&utm_source=Homepage&utm_medium=Weddingtales&utm_campaign=kalighata',
    category: 'Kalighata',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/designers/ridhi-mehra?sort=new_desc&utm_source=Homepage&utm_medium=Weddingtales&utm_campaign=ridhi-mehra',
    category: 'Ridhi Mehra',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/designers/suhino?sort=new_desc&utm_source=Homepage&utm_medium=Weddingtales&utm_campaign=suhino',
    category: 'Suhino',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/clothing/lehenga/?discount_label=1_20-21_30-31_40&utm_source=homepage&utm_medium=shopbycategory&utm_campaign=WWlehenga',
    category: 'Lehenga',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/clothing/kurta-sets-salwar-kameez/',
    category: 'Kurta Sets',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/clothing/sharara-sets/?discount_label=1_20-21_30-31_40&utm_source=homepage&utm_medium=shopbycategory&utm_campaign=WWsharara',
    category: 'Sharara',
    minProducts: 25,
  },
  {
    url: 'https://www.perniaspopupshop.com/clothing/gown/?discount_label=1_20-21_30-31_40-41_50&utm_source=homepage&utm_medium=shopbycategory&utm_campaign=WWgown',
    category: 'Gowns',
    minProducts: 25,
  },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const DELAY = 600; // ms between requests
const CSV_FILE = 'new_prod.csv';

// ──────────────────────── COLOR MAP ────────────────────────
const COLOR_HEX = {
  'midnight blue':'#191970','sky blue':'#87CEEB','royal blue':'#4169E1','baby blue':'#89CFF0',
  'navy blue':'#000080','powder blue':'#B0E0E6','steel blue':'#4682B4','teal blue':'#367588',
  'ice blue':'#99E5FF','cobalt blue':'#0047AB',
  'olive green':'#808000','emerald green':'#50C878','sage green':'#BCB88A','mint green':'#98FF98',
  'forest green':'#228B22','lime green':'#32CD32','sea green':'#2E8B57',
  'rose gold':'#B76E79','old rose':'#C08081','dusty rose':'#DCAE96',
  'hot pink':'#FF69B4','baby pink':'#F4C2C2','blush pink':'#F9BFC4','rani pink':'#E52B76',
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

// Sort by length descending so multi-word colors are matched first
const COLOR_NAMES = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);

function detectColor(name, description, jsonLdColor) {
  // 1. Use JSON-LD color directly if available
  if (jsonLdColor) {
    const lower = jsonLdColor.toLowerCase().trim();
    for (const c of COLOR_NAMES) {
      if (lower.includes(c)) return { name: c.charAt(0).toUpperCase() + c.slice(1), hex: COLOR_HEX[c] };
    }
  }
  // 2. Fallback: search name then description with word boundaries
  for (const text of [name, description]) {
    if (!text) continue;
    const lower = text.toLowerCase();
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

// ──────────────────── COLLECT PRODUCT URLS ────────────────────
async function collectProductUrls(collectionUrl, minProducts) {
  const urls = new Set();
  let page = 1;
  
  while (urls.size < minProducts) {
    const sep = collectionUrl.includes('?') ? '&' : '?';
    const pageUrl = page === 1 ? collectionUrl : `${collectionUrl}${sep}page=${page}`;
    
    try {
      const res = await fetch(pageUrl, { headers: HEADERS });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);
      
      // Product cards are <a class="ProductCard" href="...">
      const cards = $('a.ProductCard');
      if (cards.length === 0) break;
      
      let addedThisPage = 0;
      cards.each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.endsWith('.html')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.perniaspopupshop.com${href}`;
          if (!urls.has(fullUrl)) {
            urls.add(fullUrl);
            addedThisPage++;
          }
        }
      });
      
      if (addedThisPage === 0) break; // No new products, stop paging
      page++;
      await sleep(DELAY);
    } catch (e) {
      console.error(`  Error fetching page ${page}: ${e.message}`);
      break;
    }
  }
  
  return [...urls].slice(0, Math.max(minProducts, 30)); // Keep up to 30
}

// ──────────────────── SCRAPE PRODUCT DETAIL ────────────────────
async function scrapeProduct(productUrl, category) {
  const res = await fetch(productUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  // 1. JSON-LD structured data
  let jsonLd = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'Product') jsonLd = data;
    } catch {}
  });
  
  // 2. Extract fields
  const brandName = jsonLd.brand?.name || '';
  const productName = jsonLd.name || $('meta[property="og:title"]').attr('content') || '';
  const cleanName = brandName ? `${brandName} - ${productName.replace(` by ${brandName} at Pernia's Pop Up Shop`, '')}` : productName;
  const sku = jsonLd.sku || '';
  const jsonLdColor = jsonLd.color || '';
  const material = jsonLd.material || '';
  
  // Description
  const descEl = $('[class*="ProductDescription"]');
  let description = jsonLd.description || '';
  if (descEl.length) {
    // Get just the description text, not the heading
    const descText = descEl.find('p, div, span').map((_, e) => $(e).text().trim()).get().join(' ');
    if (descText.length > description.length) description = descText;
    if (!description) description = descEl.text().replace('PRODUCT DESCRIPTION', '').trim();
  }
  
  // Specs (components, fit, composition, care)
  let specs = {};
  const specEl = $('[class*="ProductSpec"]');
  if (specEl.length) {
    const specText = specEl.text();
    const compMatch = specText.match(/Components?\s*(\d+)\s*\(([^)]+)\)/i);
    if (compMatch) specs.components = compMatch[2].trim();
    const fitMatch = specText.match(/FIT\s*(.+?)(?:COMPOSITION|Care|$)/is);
    if (fitMatch) specs.fit = fitMatch[1].trim().replace(/\.$/, '');
    const composeMatch = specText.match(/COMPOSITION\s*(.+?)(?:Care|FIT|$)/is);
    if (composeMatch) specs.composition = composeMatch[1].trim().replace(/\.$/, '');
    const careMatch = specText.match(/Care\s*(.+?)$/is);
    if (careMatch) specs.care = careMatch[1].trim().replace(/\.$/, '');
  }
  
  // Prices
  const salePrice = jsonLd.offers?.price || '';
  let originalPrice = '';
  const initialPriceEl = $('[class*="InitialPrice"]').first();
  if (initialPriceEl.length) {
    originalPrice = initialPriceEl.text().replace(/[₹,\s]/g, '');
  }
  if (!originalPrice) originalPrice = salePrice;
  
  // Calculate discount
  const sp = parseFloat(salePrice) || 0;
  const op = parseFloat(originalPrice) || sp;
  const discount = op > 0 ? Math.round(((op - sp) / op) * 100) : 0;
  
  // Detect color
  const color = detectColor(cleanName, description, jsonLdColor);
  
  // Images
  const imageBaseUrl = `https://img.perniaspopupshop.com/catalog/product/`;
  const thumbnail = jsonLd.image || '';
  const galleryImages = [];
  $('img[src*="catalog/product"]').each((_, el) => {
    let src = $(el).attr('src') || '';
    if (src.includes('stampimage')) {
      // Remove query parameters to get the full resolution image
      src = src.split('?')[0];
      if (!galleryImages.includes(src)) {
        galleryImages.push(src);
      }
    }
  });
  // If no stamps found, grab detailimageprod
  if (galleryImages.length === 0) {
    $('img[src*="catalog/product"]').each((_, el) => {
      let src = $(el).attr('src') || '';
      if (src && !src.includes('Blur')) {
        src = src.split('?')[0];
        if (!galleryImages.includes(src)) {
          galleryImages.push(src);
        }
      }
    });
  }
  
  // Build full description with specs
  let fullDesc = description;
  if (specs.components) fullDesc += ` Components: ${specs.components}.`;
  if (specs.composition) fullDesc += ` Composition: ${specs.composition}.`;
  if (specs.fit) fullDesc += ` Fit: ${specs.fit}.`;
  
  // Occasion detection
  let occasion = 'Festive';
  const descLower = (fullDesc + ' ' + cleanName).toLowerCase();
  if (descLower.includes('bridal') || descLower.includes('wedding')) occasion = 'Wedding';
  else if (descLower.includes('cocktail') || descLower.includes('party')) occasion = 'Party';
  else if (descLower.includes('casual')) occasion = 'Casual';
  
  // Care
  const care = specs.care || 'Dry clean only';
  
  // Fit type
  const fitType = specs.fit?.toLowerCase().includes('slim') ? 'Slim' : 'Regular';
  
  return {
    name: cleanName,
    description: fullDesc,
    material: material || specs.composition || '',
    fit_type: fitType,
    occasion: occasion,
    care_instructions: care,
    category: category,
    base_price: op,
    sale_price: sp || op,
    discount_percent: discount,
    is_active: 'true',
    is_featured: 'true',
    is_new_arrival: 'true',
    is_best_seller: 'false',
    color_name: color.name,
    color_hex: color.hex,
    size: 'M',
    stock_qty: 10,
    thumbnail_url: thumbnail,
    gallery_urls: galleryImages.join(', '),
  };
}

// ──────────────────── MAIN ────────────────────
async function main() {
  console.log('======================================================================');
  console.log("  Pernia's Pop Up Shop — Bulk Scraper");
  console.log('======================================================================');
  
  const allProducts = [];
  
  for (const col of COLLECTIONS) {
    console.log(`\nFetching collection: ${col.category}`);
    console.log(`  URL: ${col.url}`);
    
    const urls = await collectProductUrls(col.url, col.minProducts);
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
  console.log(`Total products scraped: ${allProducts.length}`);
  
  // Read existing CSV to get row count
  let existingLines = 0;
  if (fs.existsSync(CSV_FILE)) {
    const existing = fs.readFileSync(CSV_FILE, 'utf-8');
    existingLines = existing.trim().split('\n').length - 1; // minus header
    console.log(`Existing products in ${CSV_FILE}: ${existingLines}`);
  }
  
  // Build CSV rows
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
  
  // Append to existing CSV
  const rowsText = csvRows.join('\n');
  fs.appendFileSync(CSV_FILE, '\n' + rowsText);
  
  console.log(`Appended ${allProducts.length} products to ${CSV_FILE}`);
  console.log(`Total products now: ${existingLines + allProducts.length}`);
}

main().catch(console.error);
