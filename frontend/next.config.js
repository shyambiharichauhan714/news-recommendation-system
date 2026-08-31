/** @type {import('next').NextConfig} */

/**
 * Resolves the API origin for the dev/prod proxy below.
 *
 * Next validates rewrite destinations at build time and fails the whole build
 * with "Invalid rewrite found" if one isn't a well-formed absolute URL. An
 * unset or malformed BACKEND_ORIGIN (a Vercel "Sensitive" variable is not
 * exposed during build, and piping a value in can append a stray newline)
 * would otherwise take the deployment down. Falling back to localhost keeps
 * the build green; the frontend then serves its bundled demo dataset.
 */
function resolveBackendOrigin() {
  const fallback = "http://localhost:8000";
  const raw = (process.env.BACKEND_ORIGIN || "").trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    console.warn(`[next.config] BACKEND_ORIGIN is not a valid URL: ${JSON.stringify(raw)}`);
    return fallback;
  }
}

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
    return [{ source: "/api/:path*", destination: `${resolveBackendOrigin()}/api/:path*` }];
  },
};

module.exports = nextConfig;
