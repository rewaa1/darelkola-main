import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

// Points the plugin at our request configuration (default location: ./src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
