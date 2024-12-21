var utils = require('./utils')
var webpack = require('webpack')
var config = require('../config')
var { merge } = require('webpack-merge')
var baseWebpackConfig = require('./webpack.base.conf')
var HtmlWebpackPlugin = require('html-webpack-plugin')

// add hot-reload related code to entry chunks
Object.keys(baseWebpackConfig.entry).forEach(function (name) {
  baseWebpackConfig.entry[name] = ['./build/dev-client'].concat(baseWebpackConfig.entry[name])
})

module.exports = merge(baseWebpackConfig, {
  mode: 'development',
  module: {
    rules: utils.styleLoaders({ sourceMap: config.dev.cssSourceMap })
  },
  // cheap-module-eval-source-map is faster for development
  devtool: 'source-map',
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    }),
    new webpack.DefinePlugin(Object.assign({
      NODE_ENV: config.dev.env.NODE_ENV
    }, utils.getServerPublicVars())),
    // https://github.com/ampedandwired/html-webpack-plugin
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: '!!html-loader!index.html',
      inject: true
    })
  ]
})
