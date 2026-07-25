import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ['firebase-admin', 'teleproto'],

  experimental: {
    // Server Actions receive uploaded files (CVs, project docs) as their body.
    // The default 1MB limit rejects most PDF/DOCX uploads with a 500 before the
    // action runs, so raise it to comfortably fit real CV/document uploads.
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

