var vows = require('vows'),
    assert = require("assert");

require('../SC/core');
require('../ThothSC');

vows.describe("pretest checks").addBatch({
  'SC': {
    topic: SC,
    
    'exists': function(t){
      assert.ok(t);
    },
    
    '.Store exists': function(t){
      assert.ok(t.Store);
    },
    
    '.Store can be created': function(t){
      assert.ok(t.Store.create());
    }
  }
}).export(module);