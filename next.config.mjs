/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved to the root level to clear the validation error
  allowedDevOrigins: ['localhost:3000', '192.168.1.243'],
};

export default nextConfig;