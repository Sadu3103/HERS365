import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.hers365.app',
    appName: 'HERS365',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    ios: {
        cordovaSwiftVersion: '5.0',
        minVersion: '13.0'
    },
    android: {
        minSdkVersion: 22,
        buildToolsVersion: '33.0.0',
        compileSdkVersion: 33
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 3000,
            launchAutoHide: true,
            backgroundColor: '#2563eb',
            androidSplashResourceName: 'splash',
            androidAdaptableSplashResourceName: 'splash'
        }
    }
};

export default config;
