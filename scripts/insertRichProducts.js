import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');

// Detailed product knowledge base based on the prompts
const PRICING_AND_DETAILS = {
    "Regal Red Silk Anarkali with Zari Embroidery": {
        category: 'anarkali', price: 6999, sale_price: 5999, color_name: 'Regal Red', color_hex: '#CE2029',
        description: "A breathtaking Regal Red Silk Anarkali suit showcasing intricate golden Zari embroidery on the bodice and hemline. Features a deep back neckline with traditional tassels. Perfect for standing out at any festive gathering.",
        material: "Pure Silk", fit_type: "Flared", occasion: ["Wedding", "Festive"], care_instructions: "Dry clean only."
    },
    "Emerald Green Georgette Anarkali with Sequin Work": {
        category: 'anarkali', price: 5999, sale_price: 4999, color_name: 'Emerald Green', color_hex: '#50C878',
        description: "An elegant Emerald Green Georgette Anarkali featuring shimmering tonal sequin work cascading down a massive flared skirt. Includes an elegant back keyhole design and matching sheer dupatta.",
        material: "Georgette with Sequins", fit_type: "Flared", occasion: ["Party", "Festive"], care_instructions: "Dry clean only."
    },
    "Midnight Blue Velvet Anarkali with Antique Gold Motif": {
        category: 'anarkali', price: 8999, sale_price: 7999, color_name: 'Midnight Blue', color_hex: '#191970',
        description: "A luxurious Midnight Blue Velvet Anarkali suit designed for winter weddings. Showcases heavy antique gold floral motifs on a plush velvet bodice with a regal drape and sheer net dupatta.",
        material: "Premium Velvet", fit_type: "Regal Flared", occasion: ["Winter Wedding", "Reception"], care_instructions: "Dry clean only. Store in a cool, dry place."
    },
    "Pastel Peach Chiffon Anarkali with Pearl Embellishments": {
        category: 'anarkali', price: 5499, sale_price: 4499, color_name: 'Pastel Peach', color_hex: '#FFDAB9',
        description: "A soft, airy Pastel Peach Chiffon Anarkali featuring delicate pearl and silver thread embellishments. Translucent chiffon layers create a breezy movement perfect for daytime events.",
        material: "Chiffon with Pearl Handwork", fit_type: "Flowy", occasion: ["Day Wedding", "Party"], care_instructions: "Gentle hand wash or dry clean."
    },
    "Mustard Yellow Cotton Silk Anarkali with Mirror Work": {
        category: 'anarkali', price: 4999, sale_price: 3999, color_name: 'Mustard Yellow', color_hex: '#FFDB58',
        description: "A vibrant Mustard Yellow Cotton Silk Anarkali perfect for Haldi ceremonies. Detailed with traditional Abhla Bharat mirror work on the yoke and border with a full umbrella cut.",
        material: "Cotton Silk", fit_type: "Umbrella Cut Flared", occasion: ["Haldi", "Festive"], care_instructions: "Dry clean recommended to protect mirror work."
    },
    "Royal Crimson Velvet Lehenga with Heavy Zari Work": {
        category: 'lehenga', price: 14999, sale_price: 12999, color_name: 'Royal Crimson', color_hex: '#8B0000',
        description: "A majestic Royal Crimson Velvet Lehenga Choli featuring heavy golden Zari and Dori embroidery. Comes with a deep cut choli, heavy latkans, and a massive volume skirt with cancan.",
        material: "Velvet", fit_type: "A-Line Flared", occasion: ["Bridal", "Wedding"], care_instructions: "Strictly dry clean only."
    },
    "Ivory Net Bridal Lehenga with Pastel Floral Threadwork": {
        category: 'lehenga', price: 12999, sale_price: 10999, color_name: 'Ivory', color_hex: '#FFFFF0',
        description: "A delicate Ivory Net Bridal Lehenga adorned with pastel pink and mint green floral resham threadwork. An elegant sheer back blouse and cascading florals complete this ethereal bridal look.",
        material: "Net over Silk", fit_type: "A-Line Flared", occasion: ["Bridal", "Reception"], care_instructions: "Dry clean only."
    },
    "Teal Green Raw Silk Lehenga with Gota Patti": {
        category: 'lehenga', price: 8999, sale_price: 7999, color_name: 'Teal Green', color_hex: '#008080',
        description: "A traditional Teal Green Raw Silk Lehenga featuring stunning golden Gota Patti geometric borders. Richly textured raw silk gives a beautiful pleated fall.",
        material: "Raw Silk", fit_type: "Pleated Flared", occasion: ["Mehndi", "Sangeet"], care_instructions: "Dry clean only."
    },
    "Blush Pink Organza Designer Lehenga with Ruffles": {
        category: 'lehenga', price: 9999, sale_price: 8499, color_name: 'Blush Pink', color_hex: '#FFB6C1',
        description: "A modern Blush Pink Organza Designer Lehenga featuring a multi-tiered ruffled hemline and sparse silver foil printing. Cloud-like organza creates a whimsical, airy silhouette.",
        material: "Organza", fit_type: "Ruffled Flared", occasion: ["Party", "Engagement"], care_instructions: "Dry clean only. Handle ruffles with care."
    },
    "Deep Wine Sequined Party-Wear Lehenga": {
        category: 'lehenga', price: 11999, sale_price: 9999, color_name: 'Deep Wine', color_hex: '#722F37',
        description: "A glamorous Deep Wine Party-Wear Lehenga totally drenched in monochromatic sparkling sequins. Form-fitting A-line silhouette perfect for evening cocktails.",
        material: "Sequined Mesh overlay", fit_type: "Form-fitting A-Line", occasion: ["Cocktail", "Reception"], care_instructions: "Dry clean only."
    },
    "Emerald Green Pre-Draped Crepe Saree Gown": {
        category: 'saree-gown', price: 7999, sale_price: 6999, color_name: 'Emerald Green', color_hex: '#50C878',
        description: "A chic Emerald Green Pre-Draped Crepe Saree Gown featuring a pre-stitched pallu and a glittering crystal waist belt. Sleek mermaid silhouette that effortless meshes modern and traditional.",
        material: "Crepe", fit_type: "Mermaid", occasion: ["Reception", "Cocktail"], care_instructions: "Dry clean only."
    },
    "Rose Gold Sequin Embellished Saree Gown": {
        category: 'saree-gown', price: 9499, sale_price: 8499, color_name: 'Rose Gold', color_hex: '#B76E79',
        description: "A stunning Rose Gold Sequin Embellished Saree Gown covered in thousands of shimmering metallic sequins. Features a contemporary one-shoulder neckline and sweeping dramatic train.",
        material: "Sequined Net", fit_type: "Fitted", occasion: ["Cocktail", "Party"], care_instructions: "Dry clean only."
    },
    "Midnight Blue Silk Georgette Cowl Saree Gown": {
        category: 'saree-gown', price: 8499, sale_price: 7499, color_name: 'Midnight Blue', color_hex: '#191970',
        description: "A luxurious Midnight Blue Silk Georgette Saree Gown defined by its elegant cowl drape on the bodice. Fluid folds and a pre-pleated skirt offer graceful movement.",
        material: "Silk Georgette", fit_type: "Pre-pleated Drape", occasion: ["Reception", "Evening Wear"], care_instructions: "Dry clean only."
    },
    "Blush Pink Organza Ruffled Saree Gown": {
        category: 'saree-gown', price: 7499, sale_price: 6499, color_name: 'Blush Pink', color_hex: '#FFB6C1',
        description: "A dramatic Blush Pink Organza Ruffled Saree Gown featuring heavy ruffles along the pre-pleated pallu edge. Includes a contemporary corset-style back and bouncy organza layers.",
        material: "Organza", fit_type: "Ruffled Drape", occasion: ["Engagement", "Party"], care_instructions: "Dry clean only."
    },
    "Majestic Black Velvet Indowestern Saree Gown": {
        category: 'saree-gown', price: 10999, sale_price: 9499, color_name: 'Majestic Black', color_hex: '#000000',
        description: "A regal Black Velvet Indowestern Saree Gown boasting heavy antique gold Zardozi embroidery. Structured tailored fit combining western gown styling with Indian drape over one shoulder.",
        material: "Velvet", fit_type: "Structured", occasion: ["Gala", "Cocktail"], care_instructions: "Dry clean only."
    }
};

async function getOrCreateCategory(slug, name) {
    let { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .single();

    if (catErr || !catData) {
        console.log(`Creating category '${name}'...`);
        const { data: newCat, error: newCatErr } = await supabase
            .from('categories')
            .insert({ name, slug, is_active: true })
            .select().single();
        if (newCatErr) throw newCatErr;
        return newCat.id;
    }
    return catData.id;
}

async function run() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@elara.com',
        password: 'Elara@admin_2026'
    });

    if (authError) {
        console.error("Login failed:", authError);
        return;
    }
    console.log("Logged in successfully");

    // Scan media folder
    if (!fs.existsSync(MEDIA_DIR)) {
        console.log("Media directory not found:", MEDIA_DIR);
        return;
    }

    const files = fs.readdirSync(MEDIA_DIR);

    // Group files by product name
    const productsInMedia = {};
    for (const file of files) {
        if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.webp')) continue;

        let baseName = file.replace(/_(front|back|closeup|angle)\.\w+$/, '');
        if (!productsInMedia[baseName]) {
            productsInMedia[baseName] = [];
        }
        productsInMedia[baseName].push(file);
    }

    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    // Process each identified product
    for (const [productName, images] of Object.entries(productsInMedia)) {
        console.log(`\nFound product: "${productName}" with ${images.length} images.`);
        const details = PRICING_AND_DETAILS[productName];

        if (!details) {
            console.log(`Skipping: No rich details defined for "${productName}".`);
            continue;
        }

        const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Ensure category exists
        const categoryNameMapping = {
            'anarkali': 'Anarkali Suites',
            'lehenga': 'Lehenga Choli',
            'saree-gown': 'Saree Gowns'
        };
        const catId = await getOrCreateCategory(details.category, categoryNameMapping[details.category]);

        const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).single();
        let productId;

        if (existing) {
            console.log(`Updating existing product ${slug}.`);
            productId = existing.id;
            // Update to include rich details in case it was created earlier without them
            const { error: updErr } = await supabase.from('products').update({
                description: details.description,
                material: details.material,
                fit_type: details.fit_type,
                occasion: details.occasion,
                care_instructions: details.care_instructions,
                base_price: details.price,
                sale_price: details.sale_price,
            }).eq('id', productId);
            if (updErr) console.error("Error updating rich info:", updErr);
        } else {
            console.log(`Inserting new product ${slug}.`);
            const { data: product, error: prodErr } = await supabase
                .from('products')
                .insert({
                    name: productName,
                    slug: slug,
                    description: details.description,
                    material: details.material,
                    fit_type: details.fit_type,
                    occasion: details.occasion,
                    care_instructions: details.care_instructions,
                    base_price: details.price,
                    sale_price: details.sale_price,
                    category_id: catId,
                    is_active: true
                })
                .select()
                .single();
            if (prodErr) { console.error("Error creating product", prodErr); continue; }
            productId = product.id;
        }

        // Insert variants gracefully
        for (const size of sizes) {
            const variantSku = `${slug}-${size}`.toUpperCase();

            // Upsert mechanism manually to handle conflicts nicely
            const { data: existingVar } = await supabase.from('product_variants').select('id').eq('sku', variantSku).single();
            if (!existingVar) {
                const { error: varErr } = await supabase.from('product_variants').insert({
                    product_id: productId,
                    size: size,
                    color_name: details.color_name,
                    color_hex: details.color_hex,
                    sku: variantSku,
                    stock_qty: Math.floor(Math.random() * 10) + 5, // 5 to 14 stock
                    is_active: true
                });
                if (varErr) console.error("Error inserting variant:", varErr);
            }
        }

        // Insert Images
        // First delete existing images for this product just to keep it clean (in case user regenerated them)
        await supabase.from('product_images').delete().eq('product_id', productId);

        // Sort images to prioritize front, then angle, back, closeup
        const sortWeight = { 'front': 0, 'angle': 1, 'back': 2, 'closeup': 3 };
        const getWeight = (fname) => {
            const t = fname.match(/_(front|back|closeup|angle)\./);
            return t ? sortWeight[t[1]] : 99;
        };

        images.sort((a, b) => getWeight(a) - getWeight(b));

        const imagesToInsert = images.map((fileName, idx) => {
            return {
                product_id: productId,
                public_url: `/media/${fileName}`,
                storage_path: `media/${fileName}`,
                is_primary: getWeight(fileName) === 0 || idx === 0,
                sort_order: idx
            };
        });

        const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert);
        if (imgErr) console.error("Error inserting images:", imgErr);

        console.log(`Successfully added/updated rich inventory item: ${productName}`);
    }

    console.log("\nFinished processing inventory insertion.");
}

run().catch(console.error);
