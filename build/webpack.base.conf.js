var path = require('path')
var webpack = require('webpack')
var utils = require('./utils')
var config = require('../config')
var vueLoaderConfig = require('./vue-loader.conf')
var StylelintPlugin = require('stylelint-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  entry: {
    app: './src/'
  },
  externals: {'node:fs/promises': 'commonjs2 node:fs/promises'},
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  resolve: {
    fallback: {
      fs: false,
      path: false
    },
    extensions: ['.js', '.vue', '.json'],
    alias: {
      '@': resolve('src')
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig
      },
      // We can't pass graphlibrary to babel
      {
        test: /\.js$/,
        loader: 'string-replace-loader',
        include: [
          resolve('node_modules/graphlibrary')
        ],
        options: {
          search: '^\\s*(?:let|const) ',
          replace: 'var ',
          flags: 'gm'
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [
          resolve('src'),
          resolve('test'),
          resolve('node_modules/mermaid')
        ],
        exclude: [
          resolve('node_modules/mermaid/src/diagrams/class/parser'),
          resolve('node_modules/mermaid/src/diagrams/flowchart/parser'),
          resolve('node_modules/mermaid/src/diagrams/gantt/parser'),
          resolve('node_modules/mermaid/src/diagrams/git/parser'),
          resolve('node_modules/mermaid/src/diagrams/sequence/parser')
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024 // 10kb
          }
        },
        generator: {
          filename: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(ttf|eot|otf|woff2?)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: utils.assetsPath('fonts/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(md|yml|html)$/,
        type: 'asset/source'
      },
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new ESLintPlugin({
      configType: 'flat',
      overrideConfigFile: '.eslintrc.js',
    }),
    new StylelintPlugin({
      extensions: ['vue', 'scss'],
      configFile: '.stylelintrc'
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('../package.json').version)
    })
  ]
}
