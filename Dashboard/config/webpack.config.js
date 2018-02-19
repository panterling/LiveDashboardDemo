module.exports = {
    entry: './static/js/src/main.js',
    output: {
      filename: './static/js/dist/Main.js'
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