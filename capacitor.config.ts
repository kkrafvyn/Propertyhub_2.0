import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.baymiftah.app",
  appName: "BaytMiftah",
  webDir: "dist",
  bundledWebRuntime: false,
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "automatic",
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
