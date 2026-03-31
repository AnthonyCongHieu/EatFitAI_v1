module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4.x uses the Worklets Babel plugin directly.
      'react-native-worklets/plugin',
    ],
  };
};
