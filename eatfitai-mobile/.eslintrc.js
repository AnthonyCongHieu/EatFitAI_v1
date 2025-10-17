module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    '@react-native-community'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // Ép chạy Prettier song song lint để giữ code style thống nhất
    'prettier/prettier': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false
      }
    ],
    'react/react-in-jsx-scope': 'off'
  }
};
