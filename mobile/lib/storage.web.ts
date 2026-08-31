import AsyncStorage from '@react-native-async-storage/async-storage';

export const setStorageItem = (key: string, value: string) => {
  return AsyncStorage.setItem(key, value);
};

export const getStorageItem = (key: string) => {
  return AsyncStorage.getItem(key);
};

export const removeStorageItem = (key: string) => {
  return AsyncStorage.removeItem(key);
};
