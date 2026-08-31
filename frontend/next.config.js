/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async rewrites() {
    // Same-origin proxy: the browser always calls /api/* on this domain and
    // Next forwards it to the API deployment, so there is no CORS to
    // configure and no API URL baked into the client bundle.
    //
    //   local dev  -> http://localhost:8000 (uvicorn)
    //   Vercel     -> set BACKEND_ORIGIN to the API project's URL
    //
    // If the backend is unreachable the frontend falls back to its bundled
    // demo dataset (services/api.ts), so the site still renders.
    const backend = process.env.BACKEND_ORIGIN || "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

module.exports = nextConfig;
