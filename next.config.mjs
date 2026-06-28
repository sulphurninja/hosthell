/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oceanlinux.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/access-server",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
