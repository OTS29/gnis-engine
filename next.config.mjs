import dotenv from "dotenv";
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets your phone load the dev server over Wi-Fi.
  // If your Mac's IP changes, update this line.
  allowedDevOrigins: ["192.168.0.96"],
};

export default nextConfig;