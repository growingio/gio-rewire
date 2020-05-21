const argv = require('minimist')(process.argv.slice(2));

module.exports = {
  /**
   * watch mode
   */
  watch: argv['watch'],
  lib: {
    root: 'src/components'
  },
  spa: {

  }
}