
var chai = require('chai');
var expect = chai.expect;

var ts = require('../src/tiny-suspender/js/core.js');

describe('CORE Functionality', function() {
  describe('State persistence', function() {
    it('should return -1 when the value is not present', function() {
      expect([1,2,3].indexOf(4)).to.equal(-1);
    });
  });
});
