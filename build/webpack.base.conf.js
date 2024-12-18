const path = require('path');
const webpack = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const StylelintPlugin = require('stylelint-webpack-plugin');
const config = require('../config');
const packageJson = require('../package.json');

const resolve = (dir) => path.join(__dirname, '..', dir);

module.exports = {
  target: ['web', 'es2020'],
  entry: {
    app: './src/'
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath,
    clean: true
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      '@': resolve('src')
    },
    fallback: {
      fs: false,
      path: false
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|vue)$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        include: [resolve('src'), resolve('test')],
        options: {
          formatter: require('eslint-friendly-formatter')
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
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
        ]
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
          filename: 'img/[name].[hash:7][ext]'
        }
      },
      {
        test: /\.(ttf|eot|otf|woff2?)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:7][ext]'
        }
      },
      {
        test: /\.(md|yml|html)$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new StylelintPlugin({
      files: ['**/*.vue', '**/*.scss']
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(packageJson.version)
    })
  ]
}
