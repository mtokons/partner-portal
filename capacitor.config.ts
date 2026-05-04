import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sccg.partnerportal',
  appName: 'Connecting Dot Partner Portal',
  webDir: 'public',
  server: {
    url: 'https://portal.mysccg.de',
    cleartext: true
  }
};

export default config;
