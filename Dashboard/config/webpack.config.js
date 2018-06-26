require("es6-mixins")
console.log(__dirname + '/../front/js/dist')
module.exports = {
    entry: './front/js/src/main.js',
    output: {
      path: __dirname + '/../front/js/dist',
      filename: 'Main.js'
    },
    externals: {
      'vue':'Vue',
      "jquery": "jQuery"
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
        },
        { 
          test: /\.tsx?$/, 
          loader: "ts-loader" 
        }
      ]
    },
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    },
  };