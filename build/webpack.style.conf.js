var path = require('path')
var utils = require('./utils')
var webpack = require('webpack')
var utils = require('./utils')
var config = require('../config')
var MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  mode: 'production',
  entry: {
    style: './src/styles/'
  },
  module: {
    rules: [{
      test: /\.(ttf|eot|otf|woff2?)(\?.*)?$/,
      type: 'asset/resource',
      generator: {
        filename: utils.assetsPath('fonts/[name].[hash:7].[ext]')
      }
    }]
    .concat(utils.styleLoaders({
      sourceMap: config.build.productionSourceMap,
      extract: true
    })),
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: config.build.assetsPublicPath
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
            sourceMap: true,
            format: {
                beautify: false,
                comments: false
            },
            compress: {
                drop_debugger: true,
                drop_console: true
            }
        },
        extractComments: false
      }),
      new CssMinimizerPlugin()
    ],
  },
  plugins: [
    // extract css into its own file
    new MiniCssExtractPlugin({
      filename: '[name].css',
    })
  ]
}
