# Plan - Fix Broken Images in Barbearia Demo

The objective is to fix broken Unsplash images in the Barber Shop demo page (`/demo/barbearia`), specifically targeting Section 2 as requested, but also addressing other broken images found during analysis.

## Analysis
- **Broken Image 1 (Hero & Section 2):** `https://images.unsplash.com/photo-1503951914875-452162b09f6f`
- **Broken Image 2 (Gallery):** `https://images.unsplash.com/photo-1512690196222-7c7d29900279`
- **Broken Image 3 (Gallery):** `https://images.unsplash.com/photo-1621605815841-aa3396568d8c`

## Proposed Changes

### 1. Update `src/components/commercial/barber/demo/barbearia-demo.tsx`
- Replace broken image URLs with functional, high-quality Unsplash alternatives that fit the "Premium Barber Shop" aesthetic.
- **Hero/Section 2 Replacement:** `https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8` (Interior view)
- **Gallery Item 1 Replacement:** `https://images.unsplash.com/photo-1521444477879-1ffd7712b6f8` (Detail work)
- **Gallery Item 3 Replacement:** `https://images.unsplash.com/photo-1599351431247-f507fdfe3844` (Equipment/Barber in action)

## Technical Details
- Using `q=80&w=2070&auto=format&fit=crop` parameters for all new images to maintain consistency and performance.
- Verifying accessibility (alt text) remains appropriate for the new images.

## Verification Plan
- **Automated Check:** Run the Playwright script again to ensure no requests fail and all images have `naturalWidth > 0`.
- **Manual Check:** View the preview at `/demo/barbearia` to confirm the visual harmony of the new images.
