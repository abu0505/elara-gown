import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('biba.html', 'utf8');
const $ = cheerio.load(html);

const title = $('h1.product-name').text().trim() || $('h1').first().text().trim();
console.log('Title:', title);

const price = $('.price .sales .value').attr('content') || $('.price').text().trim().replace(/\s+/g, ' ');
console.log('Price:', price);

const desc = $('.product-info-wrapper').text().trim().slice(0, 100);
console.log('Desc:', desc);

const images = [];
$('.product-image-slider').find('img').each((i, el) => {
    images.push($(el).attr('src') || $(el).attr('data-src'));
});
if(images.length === 0) {
    images.push($('.primary-image').attr('src'));
    images.push($('meta[property="og:image"]').attr('content'));
}
console.log('Images:', images.filter(Boolean));

const colors = [];
$('.color-attribute a').each((i, el) => {
     colors.push({
         url: $(el).attr('href'),
         label: $(el).attr('aria-label') || $(el).text().trim()
     });
});
console.log('Colors:', colors);
