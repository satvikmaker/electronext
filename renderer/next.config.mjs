/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '../dist/renderer',
  images: {
    unoptimized: true,
  },
  // Disable server-based features for static export
  trailingSlash: true,
};

export default nextConfig;
