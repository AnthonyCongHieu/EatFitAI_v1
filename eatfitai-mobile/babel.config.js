module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Bật plugin Reanimated để tránh lỗi runtime khi dùng gesture/animation
      'react-native-reanimated/plugin',
    ],
  };
};
