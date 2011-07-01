/*globals global ThothSC*/

var vows = require('vows'),
    assert = require("assert");
    global.sc_require = function(){};
require('../SC/core');
require('../ThothSC');

vows.describe('ThothSC completeness').addBatch({  
  'ThothSC': {
    topic: ThothSC,
    
    'exists': function(t){
      assert.ok(t);
    },
    
    'has core_tools': function(t){
      assert.ok(t.connect, "no connect");
      assert.ok(t.getTopLevelName, "no getTopLevelName");
      assert.ok(t.recordTypeInQuery, "no recordTypeInQuery");
      assert.ok(t.createKey, "no createKey");
    },
    
    'has store_tools': function(t){
      assert.ok(t.loadRecord, "no loadRecord");
      assert.ok(t.mergeRelationSet, "no mergeRelationSet");
      assert.ok(t.stripRelations, "no stripRelations");
      assert.ok(t.updateOppositeRelation, "no updateOppositeRelation");
    },
    
    'has model cache': function(t){
      assert.ok(t.ModelCacheManager, "no model cache manager class");
      assert.ok(t.modelCache, "no model cache manager instance");
    },
    
    'has all clients': function(t){
      assert.ok(t.BaseClient, "no base client");
      assert.ok(t.WebSocketClient, "no web socket client");
      assert.ok(t.XHRPollingClient, "no XHR polling client");
      assert.ok(t.FakeClient, "no fake client");
    },
    
    'has model graph': function(t){
      assert.ok(t.ModelGraphBuilder, "no model graph builder");
    },
    
    'has request cache': function(t){
      assert.ok(t.RequestCacheManager, "no RequestCacheManager class");
      assert.ok(t.requestCache, "no RequestCacheManager instance");
    },
    
    'has rpc': function(t){
      assert.ok(t.RPC, "no RPC module");
    },
    
    'has user data': function(t){
      assert.ok(t.userDataCreator, "no userDataCreator");
    },
    
    'has crypto': function(t){
      assert.ok(t.Crypto, "no base crypto");
      assert.ok(t.CryptoMD5, "no MD5 crypto");
      assert.ok(t.CryptoRIPEMD160, "no RIPEMD160Crypto");
      assert.ok(t.CryptoSHA1, "no SHA1Crypto");
      assert.ok(t.CryptoSHA256, "no SHA256Crypto");
      assert.ok(t.CryptoSHA512, "no SHA512Crypto");
    }
  }
}).addBatch({
  'ThothSC.DataSource completeness': {
    topic: ThothSC.DataSource.create({ connectUsing: ThothSC.FAKE }),
    
    'has all store interface functions': function(t){
      assert.ok(t.fetch, "no fetch");
      assert.ok(t.retrieveRecords, 'no retrieveRecords');
      assert.ok(t.retrieveRecord, 'no retrieveRecord');
      assert.ok(t.createRecord, 'no createRecord');
      assert.ok(t.updateRecord, 'no updateRecord');
      assert.ok(t.destroyRecord, 'no destroyRecord');
    },
    
    'has all event functions': function(t){
      assert.ok(t.onFetchResult, "no onFetchResult");
      assert.ok(t.onRefreshRecordResult, "no onRefreshRecordResult");
      assert.ok(t.onCreateRecordResult, "no onCreateRecordResult");
      assert.ok(t.onUpdateRecordResult, "no onUpdateRecordResult");
      assert.ok(t.onDeleteRecordResult, "no onDeleteRecordResult");
      assert.ok(t.onPushedCreateRecord, "no onPushedCreateRecord");
      assert.ok(t.onPushedUpdateRecord, "no onPushedUpdateRecord");
      assert.ok(t.onPushedDeleteRecord, "no onPushedDeleteRecord");
    }
    
  }
  
})




.export(module);