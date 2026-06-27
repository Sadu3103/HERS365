import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const isIOS = (): boolean => Capacitor.getPlatform() === 'ios';
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';

export function usePlatform() {
  return {
    isNative: isNative(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: !Capacitor.isNativePlatform(),
  };
}
