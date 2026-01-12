module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // CRITICAL: react-native-reanimated plugin must be listed last
      // This ensures proper transformation of animated code
      'react-native-reanimated/plugin',
    ],
  };
};
