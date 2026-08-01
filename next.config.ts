import type { NextConfig } from "next";
import { withReticle } from "@reticlehq/next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
};

export default withReticle(nextConfig);
