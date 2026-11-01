/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@imgly/background-removal-node", "sharp"],
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false;
    }
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "@imgly/background-removal-node": "commonjs @imgly/background-removal-node",
        sharp: "commonjs sharp",
      });
    }
    return config;
  },
};

export default nextConfig;
