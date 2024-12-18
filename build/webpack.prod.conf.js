const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const baseWebpackConfig = require('./webpack.base.conf');
const config = require('../config');
const env = require('../config/prod.env');
const server_conf = require('../server/conf');

// 处理 server_conf.publicValues
const server_conf_vars = {};
function camelToSnake(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}
for (const [k, v] of Object.entries(server_conf.publicValues)) {
  server_conf_vars['process.env.' + camelToSnake(k)] = JSON.stringify(v);
}

const webpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  devtool: config.build.productionSourceMap ? 'source-map' : false,
  output: {
    path: config.build.assetsRoot,
    filename: 'js/[name].[contenthash].js',
    chunkFilename: 'js/[id].[contenthash].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            warnings: false
          }
        },
        extractComments: false
      }),
      new CssMinimizerPlugin()
    ]
  },
  plugins: [
    new webpack.DefinePlugin(Object.assign({
      'process.env': env,
      NODE_ENV: '"production"',
      GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
      GITHUB_CLIENT_ID: JSON.stringify(process.env.GITHUB_CLIENT_ID || '')
    }, server_conf_vars)),
    new HtmlWebpackPlugin({
      filename: config.build.index,
      template: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css',
      chunkFilename: 'css/[id].[contenthash].css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../static'),
          to: config.build.assetsSubDirectory,
          globOptions: {
            ignore: ['.*']
          }
        }
      ]
    })
  ]
});

if (config.build.productionGzip) {
  const CompressionWebpackPlugin = require('compression-webpack-plugin')

  webpackConfig.plugins.push(
    new CompressionWebpackPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: new RegExp(
        '\\.(' +
        config.build.productionGzipExtensions.join('|') +
        ')$'
      ),
      threshold: 10240,
      minRatio: 0.8
    })
  )
}

if (config.build.bundleAnalyzerReport) {
  const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
  webpackConfig.plugins.push(new BundleAnalyzerPlugin())
}

module.exports = webpackConfig
