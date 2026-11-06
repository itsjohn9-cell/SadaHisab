import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sada.hisab',
  appName: 'Sada Hisab',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: '#020617'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10B981',
      sound: 'beep.wav'
    }
  }
};

export default config;
