import fs from 'fs';
import * as cheerio from 'cheerio';

async function testExtraction(url) {
  console.log(`Testing: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  let images = [];
  
  // Try finding standard product images
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      const p = data['@type'] === 'Product' ? data : (Array.isArray(data) && data[0] && data[0]['@type'] === 'Product' ? data[0] : null) || (data['@graph'] ? data['@graph'].find(d => d['@type'] === 'Product') : null);
      if (p && p.image) {
          if (Array.isArray(p.image)) images.push(...p.image);
          else if (p.image.url) images.push(p.image.url);
          else if (typeof p.image === 'string') images.push(p.image);
      }
    } catch(e) {}
  });

  // HTML fallback based on shopify and other platforms
  // Look for slick slider, fotorama, swiper, product-gallery
  $('.product-gallery img, .product-images img, .slider-main img, .fotorama img, .swiper-slide img, .gallery-item img, .slick-slide img, .ProductImages img, [data-thumbnail] img, .sp-image').each((i, el) => {
      let src = $(el).attr('data-src') || $(el).attr('data-zoom') || $(el).attr('src') || $(el).attr('srcset');
      if (src && !src.includes('data:image')) {
          if (src.includes(' ')) src = src.split(' ')[0]; // Handle srcset
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

  images = [...new Set(images.filter(i => i && i.includes('http') && !i.includes('.gif') && !i.includes('.svg')))];
  
  console.log(`Found ${images.length} unique images for ${url}`);
  console.log(images.slice(0, 5));
}

async function run() {
   await testExtraction('https://www.biba.in/pink-poly-cotton-anarkali-printed-kurta-palazzo-suit-set/SKDBNDJ8993AW23PNK.html');
   await testExtraction('https://www.bunaai.com/products/parrot-green-pompom-dress');
   await testExtraction('https://suta.in/products/reewa');
   await testExtraction('https://aashniandco.com/sheetal-batra-daisy-ivory-patra-embroidery-gharara-set-stbrangz23001.html');
   await testExtraction('https://byshree.com/products/women-viscose-beige-embroidered-kurta-sharara-dupatta-25007beige');
}
run();
