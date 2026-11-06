import type { NextConfig } from "next";
import { legacyRedirects } from "./src/lib/app-routes";

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map((item) => ({
      ...item,
      permanent: true,
    }));
  },
};

export default nextConfig;
