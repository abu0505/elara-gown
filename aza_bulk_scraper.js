import fs from 'fs';
import * as cheerio from 'cheerio';

const COLLECTIONS = [
  { url: "https://www.azafashions.com/collection/women/kurta-sets", categoryName: "Kurta Sets" },
  { url: "https://www.azafashions.com/collection/women/lehengas", categoryName: "Lehenga" },
  { url: "https://www.azafashions.com/collection/women/sarees", categoryName: "Saree" },
  { url: "https://www.azafashions.com/collection/women/kurta-sets?sub_category_id=63", categoryName: "Kurta Sets" },
  { url: "https://www.azafashions.com/collection/women/kurta-sets/anarkali-sets", categoryName: "Anarkali" },
  { url: "https://www.azafashions.com/collection/women/gowns", categoryName: "Gowns" }
];

const TARGET_COUNT = 20;

const IMAGE_BASE = "https://static3.azafashions.com/";

const COLOR_HEX = {
  "sky blue": "#87CEEB",
  "emerald green": "#50C878",
  "mehendi green": "#4A5D23",
  "mustard yellow": "#FFDB58",
  "off white": "#FAF9F6",
  ivory: "#FFFFF0", white: "#FFFFFF", black: "#000000", red: "#FF0000",
  pink: "#FFC0CB", green: "#008000", blue: "#0000FF", yellow: "#FFFF00",
  beige: "#F5F5DC", gold: "#FFD700", maroon: "#800000", rust: "#B7410E",
  mauve: "#E0B0FF", grey: "#808080", gray: "#808080", orange: "#FFA500", 
  purple: "#800080", teal: "#008080", mint: "#98FF98", peach: "#FFDAB9", 
  coral: "#FF7F50", lavender: "#E6E6FA", olive: "#808000", sage: "#BCB88A",
  mustard: "#FFDB58", bronze: "#CD7F32", brown: "#A52A2A", lime: "#00FF00",
};

function esc(str) {
  if (!str && str !== 0) return '""';
  str = String(str).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""').trim();
  return `"${str}"`;
}

function detectColor(name, description, product) {
  const propColor = product.base_color || product.color_name || product.color || '';
  if (propColor && typeof propColor === 'string') {
    const lower = propColor.toLowerCase().trim();
    if (COLOR_HEX[lower]) return { name: lower.charAt(0).toUpperCase() + lower.slice(1), hex: COLOR_HEX[lower] };
  }
  const combined = (name + ' ' + description).toLowerCase();
  const sortedColors = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  for (const color of sortedColors) {
    const regex = new RegExp(`\\b${color.replace(' ', '\\s+')}\\b`, 'i');
    if (regex.test(combined)) {
      return { name: color.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), hex: COLOR_HEX[color] };
    }
  }
  return { name: "", hex: "" };
}

function detectMaterial(text) {
  const l = text.toLowerCase();
  if (l.includes("silk")) return "Silk";
  if (l.includes("georgette")) return "Georgette";
  if (l.includes("chanderi")) return "Chanderi";
  if (l.includes("cotton")) return "Cotton";
  if (l.includes("organza")) return "Organza";
  if (l.includes("chiffon")) return "Chiffon";
  if (l.includes("velvet")) return "Velvet";
  if (l.includes("linen")) return "Linen";
  if (l.includes("net")) return "Net";
  if (l.includes("crepe")) return "Crepe";
  return "Cotton";
}

async function scrapeCollection(url, overrideCategory) {
  console.log(`\nFetching collection: ${url}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      console.log(`  ❌ Collection fetch failed HTTP ${res.status}`);
      return [];
    }
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
    if (!match) {
      console.log("  ❌ No __NEXT_DATA__ block found in collection.");
      return [];
    }
    const data = JSON.parse(match[1]);
    const items = data.props?.pageProps?.data?.list;
    if (!Array.isArray(items)) {
      console.log("  ❌ Could not find product list in JSON.");
      return [];
    }
    
    // Filter out sponsored/empty ones if any, ensure they have productUrl
    const validUrls = items
      .filter(i => i && (i.productUrl || i.url || i.slug))
      .map(i => {
         const path = i.productUrl || i.url || i.slug;
         return path.startsWith('http') ? path : `https://www.azafashions.com/${path.replace(/^\//, '')}`;
      });
      
    // Deduplicate
    const uniqueUrls = [...new Set(validUrls)];
    const urlsToScrape = uniqueUrls.slice(0, TARGET_COUNT);
    console.log(`  Found ${uniqueUrls.length} products, keeping ${urlsToScrape.length}`);
    return urlsToScrape.map(url => ({ url, overrideCategory }));

  } catch (err) {
    console.error(`  ❌ Error fetching collection: ${err.message}`);
    return [];
  }
}

async function scrapeProduct({ url, overrideCategory }) {
  // console.log(`    Scraping: ${url}`);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const nextDataTag = $('#__NEXT_DATA__');
    if (!nextDataTag.length) return null;
    
    const nextData = JSON.parse(nextDataTag.html());
    const product = nextData?.props?.pageProps?.data;
    if (!product) return null;

    let name = product.name || product.title || '';
    const designer = product.designer_name || product.brand || '';
    if (designer && !name.toLowerCase().includes(designer.toLowerCase())) {
      name = `${designer} - ${name}`;
    }

    let salePrice = product.filter_price || product.price || product.sale_price || 0;
    let originalPrice = product.mrp || product.original_price || product.compare_at_price || 0;
    if (!originalPrice || originalPrice <= salePrice) {
      originalPrice = Math.round(salePrice * 1.2);
    }
    const discount = originalPrice > 0 ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

    let description = product.stylist_note || product.description || '';
    description = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    let care = product.wash_care || product.care_instructions || 'Dry clean only';
    care = care.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    let images = [];
    const gallery = product.gallery || product.mediaGallery || product.images || [];
    if (Array.isArray(gallery)) {
      for (const item of gallery) {
        if (typeof item === 'string') {
          images.push(item.startsWith('http') ? item : IMAGE_BASE + item.replace(/^\//, ''));
        } else if (item && typeof item === 'object') {
          const imgUrl = item.url || item.src || item.image || item.file || '';
          if (imgUrl) images.push(imgUrl.startsWith('http') ? imgUrl : IMAGE_BASE + imgUrl.replace(/^\//, ''));
        }
      }
    }
    if (images.length === 0) {
      for (const key of ['product_gallery', 'media', 'product_images']) {
        const g = product[key];
        if (Array.isArray(g)) {
          for (const item of g) {
            if (typeof item === 'string') {
              images.push(item.startsWith('http') ? item : IMAGE_BASE + item.replace(/^\//, ''));
            } else if (item && typeof item === 'object') {
              for (const k of ['url', 'src', 'image', 'file']) {
                if (item[k]) {
                  const u = item[k];
                  images.push(u.startsWith('http') ? u : IMAGE_BASE + u.replace(/^\//, ''));
                  break;
                }
              }
            }
          }
        }
      }
    }
    if (images.length === 0) {
      const productStr = JSON.stringify(product);
      const cdnMatches = productStr.match(/https?:\/\/static\d*\.azafashions\.com[^\s"']+\.(?:jpg|jpeg|png|webp)/g);
      if (cdnMatches) images.push(...cdnMatches);
    }

    images = [...new Set(images)].map(url => url.replace(/\|.*$/, ''));
    if (images.length === 0) return null; // Skip if no images

    const thumbnailUrl = images[0] || '';
    const galleryUrls = images.length > 1 ? images.slice(1).join(', ') : '';

    const color = detectColor(name, description, product);
    const material = detectMaterial(name + ' ' + description);

    // console.log(`      ✅ ${name.substring(0, 40)}... | ₹${salePrice} | ${images.length} imgs`);

    return {
      name, description, material,
      fit_type: 'Regular', occasion: 'Festive',
      care_instructions: care, category: overrideCategory,
      base_price: originalPrice, sale_price: salePrice,
      discount_percent: discount,
      is_active: 'true', is_featured: 'true',
      is_new_arrival: 'true', is_best_seller: 'false',
      color_name: color.name, color_hex: color.hex,
      size: 'M', stock_qty: 10,
      thumbnail_url: thumbnailUrl, gallery_urls: galleryUrls,
    };
  } catch (err) {
    // console.error(`    ❌ Error scraping product: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log('  Aza Fashions Bulk Scraper');
  console.log('='.repeat(70));
  
  let allProductUrls = [];
  
  // 1. Collect URLs for each collection
  for (const collection of COLLECTIONS) {
       const productUrlObjs = await scrapeCollection(collection.url, collection.categoryName);
       allProductUrls.push(...productUrlObjs);
       await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nTotal products queued for scraping: ${allProductUrls.length}`);
  console.log('=' .repeat(70));

  const scrapedData = [];
  let successCount = 0;
  let failedCount = 0;

  // 2. Scrape each product
  for (let i = 0; i < allProductUrls.length; i++) {
    process.stdout.write(`\rScraping [${i + 1}/${allProductUrls.length}]... `);
    const data = await scrapeProduct(allProductUrls[i]);
    if (data) {
        scrapedData.push(data);
        successCount++;
        process.stdout.write(`✅\x1b[K`);
    } else {
        failedCount++;
        process.stdout.write(`❌\x1b[K`);
    }
    // Small delay between requests to be nice to the server
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n\nScraping complete! Success: ${successCount}, Failed: ${failedCount}`);

  // 3. Save to CSV
  if (scrapedData.length > 0) {
      const headers = [
        'name', 'description', 'material', 'fit_type', 'occasion',
        'care_instructions', 'category', 'base_price', 'sale_price',
        'discount_percent', 'is_active', 'is_featured', 'is_new_arrival',
        'is_best_seller', 'color_name', 'color_hex', 'size', 'stock_qty',
        'thumbnail_url', 'gallery_urls'
      ];

      const csvRows = [headers.join(',')];
      for (const p of scrapedData) {
        const row = [
          esc(p.name), esc(p.description), esc(p.material),
          esc(p.fit_type), esc(p.occasion), esc(p.care_instructions),
          esc(p.category), p.base_price, p.sale_price, p.discount_percent,
          p.is_active, p.is_featured, p.is_new_arrival, p.is_best_seller,
          esc(p.color_name), esc(p.color_hex), esc(p.size), p.stock_qty,
          esc(p.thumbnail_url), esc(p.gallery_urls)
        ];
        csvRows.push(row.join(','));
      }

      fs.writeFileSync('new_prod.csv', csvRows.join('\n'));
      console.log(`Saved ${scrapedData.length} products to new_prod.csv`);
  }
}

run();
