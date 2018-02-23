module.exports = {
    entry: './static/js/src/main.js',
    output: {
      path: __dirname + '/../static/js/dist',
      filename: 'Main.js'
    },
    externals: {
      'vue':'Vue'
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            loaders: {
            }
            // other vue-loader options go here
          }
        }
      ]
    },
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    },
  };