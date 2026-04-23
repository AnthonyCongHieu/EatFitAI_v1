module.exports = {
  root: true,
  ignorePatterns: ['src/_archive/**'],
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    '@react-native-community',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    jest: true,
    'jest/globals': true,
  },
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
  settings: {
    'import/core-modules': ['expo-image-manipulator'],
  },
  rules: {
    // Formatting duoc chay bang npm run format; lint tap trung vao code issues.
    'prettier/prettier': 'off',
    'no-void': 'off',
    'unicode-bom': 'off',
    curly: 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'react-native/no-inline-styles': 'off',
    'react/no-unstable-nested-components': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/ban-types': 'off',
    radix: 'off',
    'no-alert': 'off',
  },
  overrides: [
    {
      files: ['__tests__/**/*.ts', '__tests__/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
