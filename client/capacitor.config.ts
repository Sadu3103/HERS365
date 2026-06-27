import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.hers365.app',
    appName: 'HERS365',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        hostname: 'hers365.app',
        iosScheme: 'https',
    },
    ios: {
        minVersion: '15.0',
        contentInset: 'automatic',
        scrollEnabled: false,
        backgroundColor: '#0a0a0a',
    },
    android: {
        minSdkVersion: 24,
        buildToolsVersion: '34.0.0',
        compileSdkVersion: 34,
        backgroundColor: '#0a0a0a',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            launchFadeOutDuration: 500,
            backgroundColor: '#0a0a0a',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#0a0a0a',
            overlaysWebView: false,
        },
        Keyboard: {
            resize: 'body',
            style: 'dark',
            resizeOnFullScreen: true,
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
    },
};

export default config;
