/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA (manifest + service worker) wired up in Phase 3 alongside the
  // offline SOS queue — see docs/PHASE-1-PRODUCT-DEFINITION.md §18.
};

export default nextConfig;
