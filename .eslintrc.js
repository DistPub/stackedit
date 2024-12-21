const eslintJS = require("@eslint/js")
const eslintImport = require("eslint-plugin-import")
const vueParser = require("vue-eslint-parser")
const babelParser = require("@babel/eslint-parser")
const globals = require("globals")
module.exports = {
  files: ["**/*.{js,vue}"],
  ignores: [
    'build/*.js',
    'config/*.js',
    'src/libs/*.js',
  ],
  languageOptions: {
    "parser": vueParser,
    "parserOptions": {
        "parser": babelParser,
        "sourceType": "module"
    },
    globals: {
      ...globals.node,
      ...globals.browser,
      "NODE_ENV": false,
      "VERSION": false
    }
  },
  plugins: {
    import: eslintImport,
  },
  // check if imports actually resolve
  'settings': {
    'import/resolver': {
      'webpack': {
        'config': 'build/webpack.base.conf.js'
      }
    }
  },
  linterOptions: {
    "reportUnusedDisableDirectives": 'off',
  },
  'rules': {
    ...eslintJS.configs.recommended.rules,
    'no-param-reassign': [2, { 'props': false }],
    // don't require .vue extension when importing
    'import/extensions': ['error', 'always', {
      'js': 'never',
      'vue': 'never'
    }],
    // allow optionalDependencies
    'import/no-extraneous-dependencies': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-unused-vars': 0,
    'no-redeclare': 0,
  }
}
