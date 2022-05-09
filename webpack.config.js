require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
})
const path = require('path')
const url = require('url')
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const WebpackUserscript = require('webpack-userscript')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = env => {
  const devConfig = {
    mode: "development",
    devtool: 'inline-source-map',
    devServer: {
      hot: false,
      liveReload: false,
      client: false,

      port: 4900,
      devMiddleware: {
        writeToDisk: true,
      },
    }
  }
  const prodConfig = {
    mode: "production",
    optimization: {
      minimize: true,
      concatenateModules: true
    }
  }
  return {
    ...(env.development ? devConfig : {}),
    ...(env.production ? prodConfig : {}),
    target: 'web',
    entry: {
      'main': './src/entrypoint'
    },
    plugins: [
      new CleanWebpackPlugin(),
      ...(env.analyze ? [new BundleAnalyzerPlugin()] : []),
      new WebpackUserscript({
        headers: {
          name: 'Beatsaver QOL',
          description: '-',
          version: env.development ? `[version]-build.[buildNo]` : `[version]`,
          author: 'mixa3607',
          match: 'https://beatsaver.com/*',
          icon: 'https://www.google.com/s2/favicons?sz=64&domain=beatsaver.com',
          grant: ['GM.xmlHttpRequest'],
          "run-at": 'document-start'
        },
        proxyScript: {
          filename: '[basename].proxy.user.js',
          baseUrl: url.pathToFileURL(path.resolve(__dirname, 'dist')).href,
          enable: () => env.development
        },
      }),
    ],
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      environment: {
        arrowFunction: true,
        bigIntLiteral: true,
        const: true,
        destructuring: true,
        dynamicImport: true,
        forOf: true,
        module: true
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx*?$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                configFile: path.resolve(__dirname, "./tsconfig.json"),
              },
            },
          ],
          exclude: /node_modules/,
        },
      ]
    },
    resolve: {
      alias: {
        '@': path.resolve('src'),
      },
      extensions: ['.wasm', '.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'],
      modules: ['src', 'node_modules'],
      fallback: {
        path: false,
        fs: false,
        os: false,
      }
    }
  }
}
