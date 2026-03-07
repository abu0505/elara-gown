import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres:Abuturab%40Dress@db.yjulkjmrrawnjqvefizt.supabase.co:5432/postgres';

const client = new Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log('Connected to Supabase DB remotely.');

        const sql = `
      ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
      ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

      ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

      ALTER TABLE public.order_items
        ADD CONSTRAINT order_items_variant_id_fkey 
        FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
    `;

        await client.query(sql);
        console.log('SQL Migration executed successfully. product_id and variant_id foreign keys updated to ON DELETE SET NULL.');
    } catch (error) {
        console.error('Error executing SQL Migration:', error);
    } finally {
        await client.end();
    }
}

run();
