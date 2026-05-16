import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.baytmiftah.app",
  appName: "BaytMiftah",
  webDir: "dist",
  bundledWebRuntime: false,
  backgroundColor: "#ffffff",
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
      style: "LIGHT",
      resizeOnFullScreen: true,
    },
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
