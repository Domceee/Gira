/** @type {import('next').NextConfig} */
const nextConfig = {
  serverActions: {
    bodySizeLimit: "20mb",
  },
  middlewareClientMaxBodySize: "20mb",
};

module.exports = nextConfig;
