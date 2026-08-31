import * as SecureStore from 'expo-secure-store';

export const setStorageItem = (key: string, value: string) => {
  return SecureStore.setItemAsync(key, value);
};

export const getStorageItem = (key: string) => {
  return SecureStore.getItemAsync(key);
};

export const removeStorageItem = (key: string) => {
  return SecureStore.deleteItemAsync(key);
};
