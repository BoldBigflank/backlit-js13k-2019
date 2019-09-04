const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: [/node_modules/, /kontra.js$/],
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['env', { "modules": false }]
                    ]
                }
            }
        }, {
            test: /kontra.js$/,
            use: 'script-loader'
        }, {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "index.html",
            inlineSource: '.(js|css)$'
        }),
        new HtmlWebpackInlineSourcePlugin()
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    optimization: {
        minimizer: [
            new UglifyJsPlugin()
        ]
    }
}