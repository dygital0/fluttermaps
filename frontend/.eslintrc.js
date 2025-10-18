module.exports = {
    env: {
        browser: true,
        es6: true,
        jest: true, // Add this line to recognize Jest globals
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:jest/recommended', // Add this line if you're using the jest plugin
    ],
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 12,
      sourceType: 'module',
    },
    plugins: [
      'react',
      'jest'
    ],
    settings: {
        react: {
          version: 'detect', // Automatically detect the React version
        },
      },
    rules: {
        'react/react-in-jsx-scope': 'off', // Disable this rule if you're using React 17+
      },
    };