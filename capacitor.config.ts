import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.incidenciassmart.app', 
  appName: 'Incidencias Smart',      
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '861526039202-lmnbd8qv2khvm6q1mht7fnntpfs2ab5o.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;