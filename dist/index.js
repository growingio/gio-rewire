(function () {
  'use strict';

  function a() {
    console.log('abc');
  }

  var demo = {
    init: function init() {
      a();
      console.log('[001]: I am rollup.js!!');
      console.log('[002]: I am rollup.js!!');
      console.log('[003]: I am rollup.js!!');
    }
  };

  return demo;

}());
