import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change this to your own reverse-domain ID before publishing. It cannot be changed after release.
  appId: 'com.yourname.streak',
  appName: 'Streak',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      iconColor: '#1F6F5C',
    },
  },
};

export default config;
