import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leonardo.afterbite',
  appName: 'AfterBite',
  // The native shell loads the deployed Next.js app. public is the required
  // local fallback used by Capacitor when syncing the project.
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // APP_URL is required by the ios:build script and should be HTTPS in production.
    url: process.env.APP_URL,
    cleartext: !process.env.APP_URL // Allow cleartext for local dev only
  },
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
};

export default config;
