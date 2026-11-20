import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change this to your own reverse-domain ID before publishing. It cannot be changed after release.
  appId: 'com.yourname.streak',
  appName: 'Streak',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#2E6B60',
    },
  },
};

export default config;
