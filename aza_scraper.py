"""
Aza Fashions Product Scraper
=============================
Fetches product name, price, description, and ALL gallery image URLs
from azafashions.com product pages.

Usage:
    pip install requests beautifulsoup4
    python aza_scraper.py
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import time
import re

URLS = [
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
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

IMAGE_BASE = "https://static3.azafashions.com/"

# CSV columns (matching the sample_products.csv format)
CSV_COLUMNS = [
    "name", "description", "material", "fit_type", "occasion",
    "care_instructions", "category", "base_price", "sale_price",
    "discount_percent", "is_active", "is_featured", "is_new_arrival",
    "is_best_seller", "color_name", "color_hex", "size", "stock_qty",
    "thumbnail_url", "gallery_urls"
]

COLOR_HEX_MAP = {
    "ivory": "#FFFFF0", "white": "#FFFFFF", "black": "#000000",
    "red": "#FF0000", "pink": "#FFC0CB", "green": "#008000",
    "blue": "#0000FF", "yellow": "#FFFF00", "beige": "#F5F5DC",
    "gold": "#FFD700", "maroon": "#800000", "rust": "#B7410E",
    "mauve": "#E0B0FF", "grey": "#808080", "gray": "#808080",
    "orange": "#FFA500", "purple": "#800080", "teal": "#008080",
    "mint": "#98FF98", "peach": "#FFDAB9", "coral": "#FF7F50",
    "lavender": "#E6E6FA", "olive": "#808000", "sage": "#BCB88A",
}


def detect_color(name):
    """Try to detect a color from the product name."""
    name_lower = name.lower()
    for color in COLOR_HEX_MAP:
        if color in name_lower:
            return color.capitalize(), COLOR_HEX_MAP[color]
    return "", ""


def detect_category(name):
    """Detect product category from the name."""
    name_lower = name.lower()
    if "lehenga" in name_lower:
        return "Lehenga"
    elif "anarkali" in name_lower:
        return "Anarkali"
    elif "kurta" in name_lower and "sharara" in name_lower:
        return "Suit Set"
    elif "kurta" in name_lower and "palazzo" in name_lower:
        return "Suit Set"
    elif "kurta" in name_lower and "gharara" in name_lower:
        return "Suit Set"
    elif "kurta" in name_lower:
        return "Suit Set"
    elif "dress" in name_lower:
        return "Dress"
    elif "jacket" in name_lower:
        return "Jacket Set"
    elif "saree" in name_lower:
        return "Saree"
    return "Dress"


def detect_material(description):
    """Detect material from description text."""
    desc_lower = description.lower()
    if "silk" in desc_lower:
        return "Silk"
    elif "georgette" in desc_lower:
        return "Georgette"
    elif "chanderi" in desc_lower:
        return "Chanderi"
    elif "cotton" in desc_lower:
        return "Cotton"
    elif "organza" in desc_lower:
        return "Organza"
    elif "chiffon" in desc_lower:
        return "Chiffon"
    elif "velvet" in desc_lower:
        return "Velvet"
    elif "linen" in desc_lower:
        return "Linen"
    elif "net" in desc_lower:
        return "Net"
    return "Cotton"


def scrape_product(url, session):
    """Scrape a single Aza Fashions product page."""
    print(f"  Fetching: {url}")
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"    ❌ Failed to fetch: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # ── Extract __NEXT_DATA__ (primary source) ──
    next_data_tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if not next_data_tag:
        print("    ❌ No __NEXT_DATA__ found")
        return None

    try:
        next_data = json.loads(next_data_tag.string)
    except json.JSONDecodeError:
        print("    ❌ Failed to parse __NEXT_DATA__")
        return None

    # Navigate to the product data
    page_props = next_data.get("props", {}).get("pageProps", {})
    product = page_props.get("data", {})

    if not product:
        print("    ❌ No product data in pageProps")
        return None

    # ── Name ──
    name = product.get("name", "") or product.get("title", "")
    designer = product.get("designer_name", "") or product.get("brand", "")
    if designer and designer.lower() not in name.lower():
        name = f"{designer} - {name}"

    # ── Price ──
    sale_price = product.get("filter_price", 0) or product.get("price", 0) or product.get("sale_price", 0)
    original_price = product.get("mrp", 0) or product.get("original_price", 0) or product.get("compare_at_price", 0)
    if not original_price or original_price <= sale_price:
        original_price = round(sale_price * 1.2)  # assume 20% markup
    discount = round((1 - sale_price / original_price) * 100) if original_price > 0 else 0

    # ── Description ──
    description = product.get("stylist_note", "") or product.get("description", "") or ""
    # Clean HTML tags from description
    description = re.sub(r"<[^>]+>", " ", description).strip()
    description = re.sub(r"\s+", " ", description)

    # Also try to get details/composition
    details_parts = []
    composition = product.get("composition", "")
    if composition:
        details_parts.append(f"Composition: {composition}")
    care = product.get("wash_care", "") or product.get("care_instructions", "")
    if care:
        details_parts.append(f"Care: {re.sub(r'<[^>]+>', ' ', care).strip()}")

    if details_parts:
        description += " | " + " | ".join(details_parts)

    # ── Images ──
    images = []
    # Try gallery array
    gallery = product.get("gallery", []) or product.get("mediaGallery", []) or product.get("images", [])

    if isinstance(gallery, list):
        for item in gallery:
            if isinstance(item, str):
                img_url = item if item.startswith("http") else IMAGE_BASE + item.lstrip("/")
                images.append(img_url)
            elif isinstance(item, dict):
                img_url = item.get("url", "") or item.get("src", "") or item.get("image", "")
                if img_url:
                    if not img_url.startswith("http"):
                        img_url = IMAGE_BASE + img_url.lstrip("/")
                    images.append(img_url)

    # Fallback: look for product_gallery in nested structures
    if not images:
        for key in ["product_gallery", "media", "product_images"]:
            g = product.get(key, [])
            if isinstance(g, list):
                for item in g:
                    if isinstance(item, str):
                        img_url = item if item.startswith("http") else IMAGE_BASE + item.lstrip("/")
                        images.append(img_url)
                    elif isinstance(item, dict):
                        for k in ["url", "src", "image", "file"]:
                            if item.get(k):
                                img_url = item[k]
                                if not img_url.startswith("http"):
                                    img_url = IMAGE_BASE + img_url.lstrip("/")
                                images.append(img_url)
                                break

    # Fallback: search for image URLs matching their CDN pattern in the entire product JSON
    if not images:
        product_str = json.dumps(product)
        cdn_matches = re.findall(r'(https?://static\d*\.azafashions\.com[^\s"\']+\.(?:jpg|jpeg|png|webp))', product_str)
        images.extend(cdn_matches)

    # Remove duplicates while preserving order
    seen = set()
    unique_images = []
    for img in images:
        if img not in seen:
            seen.add(img)
            unique_images.append(img)
    images = unique_images

    thumbnail = images[0] if images else ""
    gallery_urls = ", ".join(images[1:]) if len(images) > 1 else ""

    # ── Detect metadata ──
    color_name, color_hex = detect_color(name + " " + description)
    category = detect_category(name)
    material = detect_material(name + " " + description)
    care_instructions = re.sub(r"<[^>]+>", " ", product.get("wash_care", "") or "Dry clean only").strip()

    print(f"    ✅ {name} | ₹{sale_price} | {len(images)} images")

    return {
        "name": name,
        "description": description,
        "material": material,
        "fit_type": "Regular",
        "occasion": "Festive",
        "care_instructions": care_instructions,
        "category": category,
        "base_price": original_price,
        "sale_price": sale_price,
        "discount_percent": discount,
        "is_active": "true",
        "is_featured": "true",
        "is_new_arrival": "true",
        "is_best_seller": "false",
        "color_name": color_name,
        "color_hex": color_hex,
        "size": "M",
        "stock_qty": 10,
        "thumbnail_url": thumbnail,
        "gallery_urls": gallery_urls,
    }


def main():
    print("=" * 60)
    print("  Aza Fashions Product Scraper")
    print("=" * 60)
    print(f"  Scraping {len(URLS)} products...\n")

    session = requests.Session()
    products = []

    for i, url in enumerate(URLS, 1):
        print(f"[{i}/{len(URLS)}]")
        product = scrape_product(url, session)
        if product:
            products.append(product)
        time.sleep(0.5)  # be polite

    # Write CSV
    output_file = "azafashion_prod.csv"
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(products)

    print(f"\n{'=' * 60}")
    print(f"  ✅ Done! Saved {len(products)} products to {output_file}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
