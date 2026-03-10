import fs from 'fs';
import * as cheerio from 'cheerio';

const startUrls = [
  'https://suta.in/products/reewa',
  'https://suta.in/products/chilka-sarovar-lehenga',
  'https://suta.in/products/crush-ki-shaadi',
  'https://www.bunaai.com/products/parrot-green-pompom-dress',
  'https://www.bunaai.com/products/dandelion-yellow-cotton-dobby-designer-co-ord-set-for-women-online',
  'https://www.bunaai.com/products/cotton-bliss-coord-set',
  'https://www.bunaai.com/products/beauty-cotton-dress',
  'https://www.bunaai.com/products/bhavika-cotton-suit-set',
  'https://www.biba.in/pink-poly-cotton-anarkali-printed-kurta-palazzo-suit-set/SKDBNDJ8993AW23PNK.html',
  'https://www.biba.in/ivory-and-gold-cotton-anarkali-kurta-churidar-suit-set/SKD6569SS20IVRGLD.html',
  'https://www.biba.in/navy-blue-cotton-anarkali-kurta-churidar-suit-set/SKDFESTIVE8248AW22NYBLU.html',
  'https://byshree.com/products/women-viscose-beige-embroidered-kurta-sharara-dupatta-25007beige',
  'https://byshree.com/products/festive-rust-radiance-georgette-kurta-set-with-split-pant-dupatta-20606onionpink',
  'https://byshree.com/products/women-cotton-off-white-embroidered-kurta-sharara-dupatta-21010offwhite',
  'https://aashniandco.com/sheetal-batra-daisy-ivory-patra-embroidery-gharara-set-stbrangz23001.html',
  'https://aashniandco.com/preeti-s-kapoor-aqua-green-floral-gota-embellished-gharara-set-pskjan24d103.html',
  'https://aashniandco.com/preeti-s-kapoor-mauve-floral-gota-embellished-sharara-set-pskjan24d108.html'
];

const visited = new Set();
const productData = [];

// Helper to sanitize CSV fields
function esc(str) {
  if (!str) return '""';
  str = String(str).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ').trim();
  return `"${str}"`;
}

async function scrapeUrl(url) {
  if (visited.has(url)) return;
  visited.add(url);
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) {
         console.log(`Failed to fetch ${url} - Status ${res.status}`);
         return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Extract JSON-LD
    let p = {};
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Product') p = data;
        else if (Array.isArray(data) && data[0] && data[0]['@type'] === 'Product') p = data[0];
        else if (data['@graph']) {
            const found = data['@graph'].find(d => d['@type'] === 'Product' || d['@type'] === 'ProductGroup');
            if (found) p = found;
        }
      } catch (e) {}
    });

    // Fallbacks from html
    let name = p.name || $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content');
    let description = p.description || $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    
    // Some stores have description in a specific div
    let details = $('.product-details').text().trim() || $('.description').text().trim();
    if (!details) details = description;

    let price = '';
    if (p.offers) {
      if (Array.isArray(p.offers)) price = p.offers[0].price || p.offers[0].lowPrice;
      else price = p.offers.price || p.offers.lowPrice;
    }
    if (!price) {
        price = $('.price').first().text().replace(/[^\d.]/g, '') || $('meta[property="product:price:amount"]').attr('content');
    }

    let images = [];
    if (Array.isArray(p.image)) {
        images.push(...p.image);
    } else if (p.image && p.image.url) {
        images.push(p.image.url);
    } else if (typeof p.image === 'string') {
        images.push(p.image);
    }

    // fallback to HTML extraction for images, looking for typical gallery classes
    $('.product-gallery img, .product-images img, .slider-main img, .fotorama img, .swiper-slide img, .gallery-item img, .slick-slide img, .ProductImages img, [data-thumbnail] img, .sp-image, .product-image-slider img, .product-gallery__image img, .magiczoomplus img, .product-image img').each((i, el) => {
        let src = $(el).attr('data-src') || $(el).attr('data-zoom') || $(el).attr('src') || $(el).attr('srcset') || $(el).attr('data-image-big');
        if (src && !src.includes('data:image')) {
             if (src.includes(' ')) src = src.split(' ')[0]; // Handle srcset
             if (src.includes('?')) src = src.split('?')[0]; // discard typical query params for cleaner URLs
             if (src.startsWith('//')) src = 'https:' + src;
             else if (src.startsWith('/')) src = new URL(src, url).href;
             images.push(src);
        }
    });

    // some stores have images in a javascript variable (like Shopify's meta or product json)
    const productJsonMatch = html.match(/var\s+meta\s*=\s*({[\s\S]+?});/);
    if (productJsonMatch) {
       try {
           const meta = JSON.parse(productJsonMatch[1]);
           if (meta.product && meta.product.images) {
              images.push(...meta.product.images.map(img => img.startsWith('//') ? 'https:'+img : img));
           }
       } catch(e){}
    }

    // Also look for Shopify's typical `images` array in script tags
    const imagesMatch = html.match(/"images"\s*:\s*(\[.*?\])/);
    if (imagesMatch) {
        try {
            const imgs = JSON.parse(imagesMatch[1]);
            if (Array.isArray(imgs)) {
               images.push(...imgs.map(img => img.startsWith('//') ? 'https:'+img : (img.startsWith('http') ? img : 'https://'+new URL(url).hostname+img)));
            }
        } catch(e){}
    }
    
    // remove duplicates and filter out invalid/gif/svgs
    images = [...new Set(images.filter(i => i && i.includes('http') && !i.includes('.gif') && !i.includes('.svg')))];

    if (images.length === 0) {
        let metaImg = $('meta[property="og:image"]').attr('content');
        if (metaImg) images.push(metaImg);
    }

    let thumbnail_url = images.length > 0 ? images[0] : '';
    let gallery_urls = images.length > 1 ? images.slice(1).join(', ') : '';

    let color = p.color || '';
    // if color not in schema, try extracting from title
    if (!color && name) {
        const colorsList = ['pink', 'blue', 'green', 'yellow', 'white', 'black', 'red', 'maroon', 'ivory', 'gold', 'beige', 'rust', 'onion pink', 'aqua green', 'mauve', 'parrot green'];
        for(let c of colorsList) {
            if(name.toLowerCase().includes(c)) {
                color = c;
                break;
            }
        }
    }
    
    // map basic colors to hex
    const hexMap = {
        'pink': '#FFC0CB', 'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00',
        'white': '#FFFFFF', 'black': '#000000', 'red': '#FF0000', 'maroon': '#800000',
        'ivory': '#FFFFF0', 'gold': '#FFD700', 'beige': '#F5F5DC', 'rust': '#B7410E',
        'onion pink': '#E8A2BA', 'aqua green': '#12E193', 'mauve': '#E0B0FF', 'parrot green': '#8DED2A'
    };
    let color_hex = hexMap[color.toLowerCase()] || '';

    let category = 'Dress';
    if (name.toLowerCase().includes('kurta') || name.toLowerCase().includes('suit')) category = 'Suit Set';
    else if (name.toLowerCase().includes('lehenga')) category = 'Lehenga';
    else if (name.toLowerCase().includes('saree')) category = 'Saree';
    else if (name.toLowerCase().includes('co-ord')) category = 'Co-ord Set';

    // Mock defaults for required fields
    let material = 'Cotton';
    if (name.toLowerCase().includes('silk')) material = 'Silk';
    else if (name.toLowerCase().includes('georgette')) material = 'Georgette';
    else if (name.toLowerCase().includes('viscose')) material = 'Viscose';

    let base_price = price ? parseFloat(price) : 0;
    // let's assume base price is 20% more if it's on sale, but since price is just scraped, we'll put sale_price = scraped and base_price = scraped * 1.2
    let actual_base_price = (base_price * 1.2).toFixed(2);
    let sale_price = base_price.toFixed(2);
    let discount_percent = 20;

    productData.push({
      url,
      name,
      description,
      material,
      fit_type: 'Regular',
      occasion: 'Festive',
      care_instructions: 'Dry clean only',
      category,
      base_price: actual_base_price,
      sale_price,
      discount_percent,
      is_active: 'true',
      is_featured: 'true',
      is_new_arrival: 'true',
      is_best_seller: 'false',
      color_name: color,
      color_hex,
      size: 'M',
      stock_qty: 10,
      thumbnail_url,
      gallery_urls
    });

    // Extract other color links if any!
    const colorUrls = [];
    $('a.swatch-circle.color-value').each((i, el) => {
        let h = $(el).attr('href');
        if (h && !h.startsWith('javascript:')) {
            if (h.startsWith('/')) h = new URL(h, url).href;
            colorUrls.push(h);
        }
    });

    $('.swatch-element.color a, .color-swatch a, .color-swatches a, a.color-attribute').each((i, el) => {
        let h = $(el).attr('href');
        if (h && !h.startsWith('javascript:')) {
             if (h.startsWith('/')) h = new URL(h, url).href;
             colorUrls.push(h);
        }
    });
    
    for (const cUrl of colorUrls) {
        if (!visited.has(cUrl)) {
             console.log(`Found variant URL: ${cUrl}`);
             await scrapeUrl(cUrl);
        }
    }

  } catch (err) {
    console.error(`Error processing ${url}:`, err.message);
  }
}

async function run() {
  for (const url of startUrls) {
    await scrapeUrl(url);
  }
  
  // Write CSV
  const headers = [
      'name', 'description', 'material', 'fit_type', 'occasion', 'care_instructions', 'category', 'base_price', 'sale_price', 'discount_percent', 'is_active', 'is_featured', 'is_new_arrival', 'is_best_seller', 'color_name', 'color_hex', 'size', 'stock_qty', 'thumbnail_url', 'gallery_urls'
  ];
  
  const csvRows = [headers.join(',')];
  for (const p of productData) {
      let row = [
          esc(p.name),
          esc(p.description),
          esc(p.material),
          esc(p.fit_type),
          esc(p.occasion),
          esc(p.care_instructions),
          esc(p.category),
          p.base_price,
          p.sale_price,
          p.discount_percent,
          p.is_active,
          p.is_featured,
          p.is_new_arrival,
          p.is_best_seller,
          esc(p.color_name),
          esc(p.color_hex),
          esc(p.size),
          p.stock_qty,
          esc(p.thumbnail_url),
          esc(p.gallery_urls)
      ];
      csvRows.push(row.join(','));
  }
  
  fs.writeFileSync('extracted_products.csv', csvRows.join('\n'));
  console.log(`\nSuccessfully saved ${productData.length} records to extracted_products.csv`);
}

run();
