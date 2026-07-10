import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Without this, Turbopack walks up to a stray package-lock.json under
    // C:\Users\Asus\ (an unrelated project) and infers THAT as the
    // workspace root — which anchors the file watcher at C:\Users\Asus\
    // instead of this project, dragging in unrelated huge directory trees
    // (Desktop, Documents, etc.) and pegging CPU. Pin it explicitly.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
