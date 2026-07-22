import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Tell Turbopack the workspace root explicitly so it doesn't try to infer
  // (which fails on Vercel and in folders with spaces or sibling lockfiles).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
