require('./check-versions')()

var config = require('../config')
Object.keys(config.dev.env).forEach((key) => {
  if (!process.env[key]) {
    process.env[key] = JSON.parse(config.dev.env[key]);
  }
});

// default port where dev server listens for incoming traffic
var port = process.env.PORT || config.dev.port
// automatically open browser, if not set will be false
var autoOpenBrowser = !!config.dev.autoOpenBrowser
const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.dev.conf');
var path = require('path');

const compiler = Webpack(webpackConfig);
const devServerOptions = {
  static: [
    webpackConfig.output.publicPath,
    {
      directory: path.join(__dirname, '../static'),
      publicPath: '/static',
    },
  ],
  client: {
    overlay: false,
  },
  compress: true,
  port: port,
  open: autoOpenBrowser
};
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
  console.log('Starting server...');
  await server.start();
};

runServer();
