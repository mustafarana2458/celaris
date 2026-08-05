/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.celaris.cloud',
      },
    ],
  },
  experimental: {
    // Next 14's default client Router Cache keeps a dynamically-rendered
    // page's RSC payload for 30s after it's left. Server Actions elsewhere
    // (e.g. deleting a milestone from a project's detail page) revalidate
    // that route's server-side cache immediately via revalidatePath, but a
    // soft <Link>/router.push navigation back to an already-visited page
    // within that 30s window was still served the stale client-cached
    // payload -- only a hard refresh bypassed it. Setting dynamic staleTime
    // to 0 makes every soft navigation to a dynamic route refetch fresh.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;