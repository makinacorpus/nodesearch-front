const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const dist = path.resolve(__dirname, 'dist');

  const plugins = [
    new CleanWebpackPlugin([dist]),
    new MiniCssExtractPlugin({filename: "nodesearch.css"})
  ];

  if ('production' === argv.mode) {
    plugins.push(new MinifyPlugin());
  }

  return {
    entry: ['core-js/modules/es6.promise', './src/index.js'],
    devtool: ('production' === argv.mode ? false : 'source-map'),
    plugins: plugins,
    module: {
      rules: [{
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [{
          loader: "babel-loader"
        }, {
          loader: "ts-loader"
        }],
      },{
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [{
          loader: "babel-loader"
        }]
      },{
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "less-loader"
        ]
      }]
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"]
    },
    externals: {
      "react": "React",
      "react-dom": "ReactDOM"
    },
    output: {
      filename: 'nodesearch.js',
      library: 'NodeSearch',
      libraryTarget:'umd',
      path: dist
    }
  };
};
