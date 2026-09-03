import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'code-trekking',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // 🔐 Permitir navegación hacia PayPal
    allowNavigation: [
      '*.paypal.com',
      '*.paypalobjects.com',
      '*.sandbox.paypal.com'
    ]
  }
};

export default config;