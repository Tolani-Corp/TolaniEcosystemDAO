import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: ".next-local",
  turbopack: {
    root: __dirname,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "src/lib/noop-async-storage.ts"),
    };
    return config;
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
