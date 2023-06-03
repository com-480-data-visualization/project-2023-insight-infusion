const path = require('path')

export default {
  root: path.resolve(__dirname, 'src'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    }
  },
  server: {
    port: 8080,
    hot: true
  },
  publicDir: '../public',
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'src/index.html'),
        co2: path.resolve(__dirname, 'src/co2.html'),
        additives: path.resolve(__dirname, 'src/additives.html'),
      },
    },
  }
}