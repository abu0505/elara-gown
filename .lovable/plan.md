

# Admin-Initiated Return Request Feature

## What Already Exists
- `src/pages/admin/Returns.tsx` — lists return requests, allows status updates and admin notes
- `create-return-request` edge function — validates customer ownership via phone, checks 7-day window, creates return request
- Dashboard shows order status breakdown but no return-specific stats

## What to Build

Enhance the existing admin Returns page to add an **"Initiate Return"** flow where admin can:
1. Search for a customer by name, phone, or order number
2. See their delivered orders and order items
3. Select items to return, enter a reason, and submit the return request directly

Then add a **recent returns summary** card to the Dashboard.

## Changes

### 1. Update `src/pages/admin/Returns.tsx`
Add a "New Return" button that opens a dialog/sheet with a multi-step flow:

**Step 1 — Search Customer**: Input field to search by customer name, phone, or order number. Query `orders` table filtering by `status = 'delivered'` and matching `shipping_name`, `customer_phone`, or `order_number`. Display matching orders in a list.

**Step 2 — Select Order & Items**: Admin clicks an order to see its items (from `order_items`). Checkboxes to select which items to return. Radio for return type (return/exchange). If exchange, show size input.

**Step 3 — Reason & Submit**: Textarea for reason. Textarea for admin note. Submit button that:
- Inserts into `return_requests` directly via Supabase client (admin has RLS ALL access)
- Updates order status to "returned"
- Inserts into `order_status_history`
- Shows success toast with return number

No edge function needed — admin is authenticated and has full RLS access to all tables.

### 2. Update `src/pages/admin/Dashboard.tsx`
Add a "Recent Returns" count to the Quick Stats grid:
- Query `return_requests` count where `status = 'requested'` (pending returns needing attention)
- Show with a `RefreshCw` icon and "Pending Returns" label

## Files to Change
- `src/pages/admin/Returns.tsx` — add "Initiate Return" dialog with search + select + reason flow
- `src/pages/admin/Dashboard.tsx` — add pending returns count to quick stats

