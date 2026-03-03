

# Women's Dress E-Commerce Store — Implementation Plan

## Overview
A mobile-first women's dress e-commerce storefront with browsing, filtering, cart, and checkout flow. Uses hardcoded dummy data (24+ products), Unsplash images, and Zustand for state management. Payment (Razorpay) is deferred to Phase 2.

---

## Step 1: Foundation & Design System
- Set up custom color palette (Deep Rose primary #C2185B, blush surfaces, etc.)
- Add Google Fonts: Inter (body) + Playfair Display (headings)
- Configure custom shadows, border radii, and spacing tokens in Tailwind
- Install Zustand and Framer Motion

## Step 2: Dummy Data & State Stores
- Create product data file with 24+ products across 6 categories (Casual, Party, Formal, Ethnic, Western, Sale) with Unsplash images
- Create category data with images
- Build Zustand stores: Cart (with coupon support), Wishlist, and Filters

## Step 3: Global Components
- **Sticky Navbar** — logo, search/wishlist/cart icons with badges, hamburger menu drawer (mobile), inline nav (desktop), blur on scroll
- **Bottom Navigation Bar** (mobile only) — Home, Search, Cart, Account
- **Product Card** — reusable card with image, wishlist toggle, badges (NEW/SALE), price, rating, Add to Cart
- **Search Overlay** — full-screen with instant filtering, trending searches, recent searches
- **Cart Drawer** — slide-in side sheet showing cart items with View Cart / Checkout buttons
- **Size Guide Modal** — measurement table
- **Toast Notifications** — using existing Sonner setup
- **Footer** — accordion on mobile, 4-column on desktop, with brand info, links, contact, payment icons

## Step 4: Home Page
- Hero carousel (3-4 slides, auto-play, swipeable, gradient overlays, CTAs)
- Shop by Category grid (2-col mobile, 6-col desktop, circular images)
- New Arrivals section (horizontal scroll mobile, 4-col grid desktop)
- Promotional banner (FLAT 30% OFF)
- Best Sellers section
- Trust badges row (Free Delivery, Returns, Authentic, Secure)
- Style Inspiration lookbook strip
- Newsletter email capture section

## Step 5: Products Listing Page
- Breadcrumb, page title, product count
- Filter & Sort — bottom sheet on mobile, sidebar on desktop (category, price range, size, color, discount)
- Active filter chips
- 2-col mobile / 4-col desktop product grid with Load More button
- Empty state for no results

## Step 6: Product Detail Page
- Swipeable image gallery (mobile) / main image + thumbnails (desktop)
- Product info: brand, name, rating, pricing with discount
- Size selector chips + Size Guide link
- Color selector swatches
- Quantity selector
- Sticky bottom CTAs: Add to Cart + Buy Now
- Accordion sections: Product Details, Delivery & Returns
- Customer Reviews section with dummy reviews
- "You May Also Like" related products strip

## Step 7: Cart Page
- Cart items list with thumbnail, details, quantity controls, remove button
- Order summary (subtotal, delivery, discount, total)
- Coupon code input (supports DRESS30 and FIRST10)
- Proceed to Checkout CTA
- Empty cart state with illustration

## Step 8: Checkout & Order Success
- **Checkout page**: Progress stepper (Cart → Address → Payment), contact info form, delivery address form (with Indian states dropdown), delivery option radio, collapsible order summary, full Zod validation, "Place Order" button (simulates order), Razorpay placeholder comments
- **Order Success page**: Checkmark animation, dummy order ID, order summary, delivery info, Continue Shopping / Track Order CTAs

## Step 9: Animations & Polish
- Page fade-in transitions
- Product card hover/tap animations
- Wishlist heart animation
- Cart icon bounce on add
- Hero carousel crossfade
- Loading skeleton shimmer states
- Smooth scroll behavior and touch optimizations

## Design Approach
- **Mobile-first**: base styles target 375px, scale up with md/lg/xl breakpoints
- **Color theme**: Deep Rose (#C2185B) primary, blush (#FFF5F7) surfaces, white backgrounds
- **Typography**: Playfair Display for headings, Inter for body text
- **All images**: Unsplash URLs with appropriate sizing parameters
- **Currency**: Indian Rupees (₹)

