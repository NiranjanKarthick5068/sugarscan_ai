const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .html (AITwin3D viewer) and .vrm (VRM model) as static assets
config.resolver.assetExts.push('html', 'vrm');

module.exports = withNativeWind(config, { input: './global.css' });
