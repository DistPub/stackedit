const { merge } = require('webpack-merge');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const baseWebpackConfig = require('./webpack.base.conf');
const config = require('../config');
const env = require('../config/dev.env');

module.exports = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  output: {
    publicPath: config.dev.assetsPublicPath
  },
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': env,
      NODE_ENV: '"development"',
      GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
      GITHUB_CLIENT_ID: JSON.stringify(process.env.GITHUB_CLIENT_ID || '')
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true
    })
  ],
  devServer: {
    hot: true,
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 8080,
    open: true,
    historyApiFallback: true,
    client: {
      overlay: true,
      progress: true
    },
    static: {
      directory: config.dev.assetsPublicPath,
      publicPath: [config.dev.assetsPublicPath]
    },
    proxy: config.dev.proxyTable || {},
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      
      // 这里可以添加自定义中间件
      
      return middlewares;
    }
  }
});
