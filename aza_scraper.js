import fs from 'fs';
import * as cheerio from 'cheerio';

const URLS = [
  "https://www.azafashions.com/products/sheetal-batra-enisa-sitaara-placket-embroidered-kurta-and-dhoti-pant-set/453912",
  "https://www.azafashions.com/products/two-sisters-by-gyans-embroidered-green-kurta-set-with-potli-bag/645996",
  "https://www.azafashions.com/products/priyal-prakash-geometric-embroidered-kurta-set/677080",
  "https://www.azafashions.com/products/asrumo-sunshine-bliss-lace-embellished-kurta-set/556625",
  "https://www.azafashions.com/products/shian-beige-georgette-embroidered-kurta-set/657653",
  "https://www.azafashions.com/products/raj-arora-embroidered-kurta-sharara-set/577610",
  "https://www.azafashions.com/products/kalakaari-by-sagarika-gota-patti-embroidered-kurta-gharara-set/579515",
  "https://www.azafashions.com/products/shian-hand-embroidered-kurta-and-sharara-set/262692",
  "https://www.azafashions.com/products/label-mansi-nagdev-pink-chanderi-hand-embroidered-anarkali-set/620454",
  "https://www.azafashions.com/products/gulabik-jaipur-mehendi-green-embroidered-kurta-set/694112",
  "https://www.azafashions.com/products/gopi-vaid-huma-embroidered-bodice-anarkali-palazzo-set/586956",
  "https://www.azafashions.com/products/prisho-embroidered-kurta-and-sharara-set/704295",
  "https://www.azafashions.com/products/almaari-by-pooja-patel-aari-sequins-embroidered-leaf-neck-anarkali-set/449147",
  "https://www.azafashions.com/products/surkh-syahi-pearl-art-print-long-jacket-with-dress/624986",
  "https://www.azafashions.com/products/bhawna-sethi-embroidered-zardosi-kurta-palazzo-set/596413",
  "https://www.azafashions.com/products/aavya-embroidered-anarkali-sharara-set/693773",
  "https://www.azafashions.com/products/shashank-arya-embroidered-anarkali-set/694066",
  "https://www.azafashions.com/products/osaa-by-adarsh-embroidered-crinkle-kurta-set/696158",
  "https://www.azafashions.com/products/surbhi-shah-chandani-embroidered-kurta-sharara-set/694381",
  "https://www.azafashions.com/products/surbhi-shah-embroidered-kurta-sharara-set/694392",
  "https://www.azafashions.com/products/mehak-murpana-ivory-sequin-embroidered-bridal-lehenga-set/465952",
  "https://www.azafashions.com/products/preevin-mirror-embroidered-tiered-lehenga-set/473156",
  "https://www.azafashions.com/products/begum-malhar-floral-woven-lehenga-set/697897",
];

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
  // 1. Try to get color from product properties first
  const propColor = product.base_color || product.color_name || product.color || '';
  if (propColor && typeof propColor === 'string') {
    const lower = propColor.toLowerCase().trim();
    if (COLOR_HEX[lower]) return { name: lower.charAt(0).toUpperCase() + lower.slice(1), hex: COLOR_HEX[lower] };
  }

  // 2. Fallback to scanning name and description
  const combined = (name + ' ' + description).toLowerCase();
  
  // Sort colors by length descending to match "Sky Blue" before "Blue"
  const sortedColors = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  
  for (const color of sortedColors) {
    const regex = new RegExp(`\\b${color.replace(' ', '\\s+')}\\b`, 'i');
    if (regex.test(combined)) {
      return { name: color.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), hex: COLOR_HEX[color] };
    }
  }
  return { name: "", hex: "" };
}

function detectCategory(name) {
  const l = name.toLowerCase();
  if (l.includes("lehenga")) return "Lehenga";
  if (l.includes("anarkali")) return "Anarkali";
  if (l.includes("sharara") || l.includes("gharara") || l.includes("palazzo") || l.includes("dhoti")) return "Suit Set";
  if (l.includes("kurta")) return "Suit Set";
  if (l.includes("dress")) return "Dress";
  if (l.includes("jacket")) return "Jacket Set";
  if (l.includes("saree")) return "Saree";
  return "Dress";
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

async function scrapeProduct(url) {
  console.log(`  Fetching: ${url}`);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) {
      console.log(`    ❌ HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract __NEXT_DATA__
    const nextDataTag = $('#__NEXT_DATA__');
    if (!nextDataTag.length) {
      console.log('    ❌ No __NEXT_DATA__ found');
      return null;
    }

    let nextData;
    try {
      nextData = JSON.parse(nextDataTag.html());
    } catch (e) {
      console.log('    ❌ Failed to parse __NEXT_DATA__');
      return null;
    }

    const product = nextData?.props?.pageProps?.data;
    if (!product) {
      console.log('    ❌ No product data in pageProps');
      return null;
    }

    // Name
    let name = product.name || product.title || '';
    const designer = product.designer_name || product.brand || '';
    if (designer && !name.toLowerCase().includes(designer.toLowerCase())) {
      name = `${designer} - ${name}`;
    }

    // Price
    let salePrice = product.filter_price || product.price || product.sale_price || 0;
    let originalPrice = product.mrp || product.original_price || product.compare_at_price || 0;
    if (!originalPrice || originalPrice <= salePrice) {
      originalPrice = Math.round(salePrice * 1.2);
    }
    const discount = originalPrice > 0 ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

    // Description
    let description = product.stylist_note || product.description || '';
    description = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Care instructions
    let care = product.wash_care || product.care_instructions || 'Dry clean only';
    care = care.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Images
    let images = [];

    // Try gallery array
    const gallery = product.gallery || product.mediaGallery || product.images || [];
    if (Array.isArray(gallery)) {
      for (const item of gallery) {
        if (typeof item === 'string') {
          images.push(item.startsWith('http') ? item : IMAGE_BASE + item.replace(/^\//, ''));
        } else if (item && typeof item === 'object') {
          const imgUrl = item.url || item.src || item.image || item.file || '';
          if (imgUrl) {
            images.push(imgUrl.startsWith('http') ? imgUrl : IMAGE_BASE + imgUrl.replace(/^\//, ''));
          }
        }
      }
    }

    // Fallback: search for product_gallery, media, product_images
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

    // Fallback: regex scan for CDN image URLs in the entire product JSON
    if (images.length === 0) {
      const productStr = JSON.stringify(product);
      const cdnMatches = productStr.match(/https?:\/\/static\d*\.azafashions\.com[^\s"']+\.(?:jpg|jpeg|png|webp)/g);
      if (cdnMatches) images.push(...cdnMatches);
    }

    // Deduplicate and clean URLs (strip trailing metadata like |image|null|0)
    images = [...new Set(images)].map(url => url.replace(/\|.*$/, ''));

    const thumbnailUrl = images[0] || '';
    const galleryUrls = images.length > 1 ? images.slice(1).join(', ') : '';

    // Detect metadata
    const combined = name + ' ' + description;
    const color = detectColor(name, description, product);
    const category = detectCategory(name);
    const material = detectMaterial(combined);

    console.log(`    ✅ ${name} | ₹${salePrice} | ${images.length} images`);

    return {
      name, description, material,
      fit_type: 'Regular', occasion: 'Festive',
      care_instructions: care, category,
      base_price: originalPrice, sale_price: salePrice,
      discount_percent: discount,
      is_active: 'true', is_featured: 'true',
      is_new_arrival: 'true', is_best_seller: 'false',
      color_name: color.name, color_hex: color.hex,
      size: 'M', stock_qty: 10,
      thumbnail_url: thumbnailUrl, gallery_urls: galleryUrls,
    };

  } catch (err) {
    console.error(`    ❌ Error: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('  Aza Fashions Product Scraper (Node.js)');
  console.log('='.repeat(60));
  console.log(`  Scraping ${URLS.length} products...\n`);

  const products = [];

  for (let i = 0; i < URLS.length; i++) {
    console.log(`[${i + 1}/${URLS.length}]`);
    const product = await scrapeProduct(URLS[i]);
    if (product) products.push(product);
    await new Promise(r => setTimeout(r, 300));
  }

  // Write CSV
  const headers = [
    'name', 'description', 'material', 'fit_type', 'occasion',
    'care_instructions', 'category', 'base_price', 'sale_price',
    'discount_percent', 'is_active', 'is_featured', 'is_new_arrival',
    'is_best_seller', 'color_name', 'color_hex', 'size', 'stock_qty',
    'thumbnail_url', 'gallery_urls'
  ];

  const csvRows = [headers.join(',')];
  for (const p of products) {
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

  fs.writeFileSync('azafashion_prod.csv', csvRows.join('\n'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ✅ Done! Saved ${products.length} products to azafashion_prod.csv`);
  console.log(`${'='.repeat(60)}`);
}

run();
