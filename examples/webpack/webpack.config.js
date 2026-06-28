const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/main.js',
  resolve: {
    extensions: ['.js', '.ts', '.vue'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  devServer: { port: 8080 },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      title: 'Vue App',
      templateParameters: { BASE_URL: '/' },
    }),
  ],
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
      { test: /\.(png|jpg|gif|svg)$/, type: 'asset/resource' },
    ],
  },
}
