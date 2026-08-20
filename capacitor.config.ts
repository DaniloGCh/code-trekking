import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'code-trekking',
  webDir: 'www',
  plugins: {
    CapacitorHttp: {
      enabled: true, // ✅ Fuerza a Capacitor a interceptar las peticiones HttpClient y realizarlas nativamente sin restricciones de CORS/WebView
    },
  },
};

export default config;
