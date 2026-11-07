import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/render": ["./node_modules/ffmpeg-static/ffmpeg", "./fonts/ArchivoBlack-Regular.ttf"],
  },
};

export default nextConfig;
