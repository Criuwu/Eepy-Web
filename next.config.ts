import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true, 

  images: {
    unoptimized: true, // Crucial for static mobile apps
  }
};

export default nextConfig;
