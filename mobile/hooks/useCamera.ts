import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);

  const requestPermission = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  }, []);

  const requestGalleryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }, []);

  const compressImage = async (uri: string) => {
    // Resize to max 1024px longest side to save bandwidth/processing
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    if (Platform.OS !== 'web') {
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || !('size' in info) || info.size < 1000) {
        throw new Error('Captured image appears to be empty or corrupted — please try again.');
      }
    }
    
    return result.uri;
  };

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return null;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      return await compressImage(photo.uri);
    } catch (e) {
      console.error('Failed to take picture:', e);
      return null;
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const hasGalleryPerm = await requestGalleryPermission();
    if (!hasGalleryPerm) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        return await compressImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Failed to pick from gallery:', e);
    }
    return null;
  }, [requestGalleryPermission]);

  return {
    hasPermission,
    requestPermission,
    cameraRef,
    takePicture,
    pickFromGallery,
  };
}
