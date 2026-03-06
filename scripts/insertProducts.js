import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // 1. Get or create category
    let { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'anarkali')
        .single();

    let categoryId;
    if (catErr || !catData) {
        console.log("Creating 'anarkali' category...");
        const { data: newCat, error: newCatErr } = await supabase
            .from('categories')
            .insert({
                name: 'Anarkali',
                slug: 'anarkali',
                is_active: true
            })
            .select()
            .single();
        if (newCatErr) throw newCatErr;
        categoryId = newCat.id;
    } else {
        categoryId = catData.id;
    }

    const products = [
        {
            name: "Emerald Green Georgette Anarkali with Sequin Work",
            price: 5999,
            sale_price: 4999,
            color_name: 'Emerald Green',
            color_hex: '#50C878'
        },
        {
            name: "Midnight Blue Velvet Anarkali with Antique Gold Motif",
            price: 6499,
            sale_price: 5499,
            color_name: 'Midnight Blue',
            color_hex: '#191970'
        },
        {
            name: "Mustard Yellow Cotton Silk Anarkali with Mirror Work",
            price: 4999,
            sale_price: 3999,
            color_name: 'Mustard Yellow',
            color_hex: '#FFDB58'
        },
        {
            name: "Pastel Peach Chiffon Anarkali with Pearl Embellishments",
            price: 5499,
            sale_price: 4499,
            color_name: 'Pastel Peach',
            color_hex: '#FFDAB9'
        },
        {
            name: "Regal Red Silk Anarkali with Zari Embroidery",
            price: 6999,
            sale_price: 5999,
            color_name: 'Regal Red',
            color_hex: '#CE2029'
        }
    ];

    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    for (const p of products) {
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        console.log(`Processing ${p.name} (slug: ${slug})...`);

        // Check if product exists
        const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).single();
        if (existing) {
            console.log(`Product ${slug} already exists, skipping.`);
            continue;
        }

        const { data: product, error: prodErr } = await supabase
            .from('products')
            .insert({
                name: p.name,
                slug: slug,
                base_price: p.price,
                sale_price: p.sale_price,
                category_id: categoryId,
                is_active: true
            })
            .select()
            .single();
        if (prodErr) { console.error("Error creating product", prodErr); continue; }

        const productId = product.id;

        // Variants
        const variantsToInsert = sizes.map(size => ({
            product_id: productId,
            size: size,
            color_name: p.color_name,
            color_hex: p.color_hex,
            sku: `${slug}-${size}`.toUpperCase(),
            stock_qty: 15,
            is_active: true
        }));

        const { error: varErr } = await supabase.from('product_variants').insert(variantsToInsert);
        if (varErr) console.error("Error inserting variants:", varErr);

        // Images
        const imageSuffixes = ['_front.png', '_back.png', '_closeup.png', '_angle.png'];
        const imagesToInsert = imageSuffixes.map((suffix, index) => {
            const fileName = `${p.name}${suffix}`;
            return {
                product_id: productId,
                public_url: `/media/${fileName}`,
                storage_path: `media/${fileName}`,
                is_primary: suffix === '_front.png',
                sort_order: index
            };
        });

        const { error: imgErr } = await supabase.from('product_images').insert(imagesToInsert);
        if (imgErr) console.error("Error inserting images:", imgErr);

        console.log(`Successfully added ${p.name}`);
    }

    console.log("Done");
}

run().catch(console.error);
