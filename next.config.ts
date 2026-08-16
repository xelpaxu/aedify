import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["leaflet", "react-leaflet", "recharts"],
  turbopack: {
    root: join(__dirname, ".."),
  },
};

export default nextConfig;
