/*globals global ThothSC*/

var vows = require('vows'),
    assert = require("assert"),
    sys = require('sys'),
    ds, store;
  
require('../SC/core');
require('../ThothSC');
require('./test_data');

ThothSC.TestDataSource = ThothSC.DataSource.extend({
  connectUsing: ThothSC.FAKE, 
  useAuthentication: false
});

store = SC.Store.create({ commitRecordsAutomatically: true}).from('ThothSC.TestDataSource');
store._getDataSource();

vows.describe("ThothSC Datasource tests").addBatch({
  
  'a standard data source': {
    
    topic: store.dataSource,
    
    'should have sendRelations set to null': function(t){
      assert.strictEqual(t.sendRelations,null);
    },
    
    'should have sendProperties set to null': function(t){
      assert.strictEqual(t.sendProperties,null);
    },
    
    'should have sendComputedProperties set to null': function(t){
      assert.strictEqual(t.sendComputedProperties,null);
    }
  },
  
  'fetch': {
    
    topic: store.dataSource,
    
    'should return false if client is not connected': function(t){
      ThothSC.client.isConnected = false;
      var ret = t.fetch(store,SC.Query.local(ThothSC.Contact));
      assert.strictEqual(ret,false);      
    },
    
    'should return false with a local query with connected client': function(t){
      ThothSC.client.isConnected = true;
      var ret = t.fetch(store,SC.Query.local(ThothSC.Contact));
      assert.strictEqual(ret,false);  
    },
    
    'and should always': {
      topic: function(t){ return t; },
      'set the store': function(t){
        assert.strictEqual(t._store,store);
      }
    },
    
    'should return true with a remote query and known model': function(t){
      var ret = t.fetch(store,SC.Query.remote(ThothSC.Contact));
      assert.strictEqual(ret,true);
    },
    
    'with a standard data source': {
      topic: function(t){
        return t;
      },
      
      'a remote request should send': {
        topic: function(t){ 
          var me = this;
          ThothSC.client.callback = function(args){ me.callback.call(me,null,args); };
          t.fetch(store,SC.Query.remote(ThothSC.Contact));
        },

        'a fetch request': function(request){
          //sys.log('request is: ' + sys.inspect(request));
          assert.ok(request[0].fetch);
        },
        
        'a fetch request containing the correct information': function(request){
          var req = request[0].fetch;
          assert.strictEqual('contact', req.bucket, "bucket has a different value, should be contact but is " + req.bucket);
          assert.strictEqual('id',req.primaryKey, "primaryKey value not equal to 'id': " + req.primaryKey);
          assert.isUndefined(req.key, "key is found defined, but should not be");
          assert.isUndefined(req.relations, "relations are found, but should be undefined");
          assert.isUndefined(req.properties, "properties are found, but should be undefined");
          assert.isUndefined(req.computedProperties, "computedproperties are found, but should be undefined");
          assert.ok(req.returnData, "returnData not found");
          assert.ok(req.returnData.requestKey, "requestKey not defined: " + sys.inspect(req.returnData));
        }
      },
      
      'adding sendRelations': {
        topic: function(t){
          t.sendRelations = true;
          return t;
        },

        'a remote request should send':{
          topic: function(t){ 
            var me = this;
            ThothSC.client.callback = function(args){ me.callback.call(me,null,args); };
            t.fetch(store,SC.Query.remote(ThothSC.Contact));
          },

          'a fetch request': function(request){
            //sys.log('request is: ' + sys.inspect(request));
            assert.ok(request[0].fetch);
          },

          'a fetch request containing the correct information': function(request){
            var req = request[0].fetch;
            assert.strictEqual('contact', req.bucket, "no bucket");
            assert.strictEqual('id',req.primaryKey, "no primaryKey value");
            assert.isUndefined(req.key, "key defined");
            assert.isArray(req.relations, "relations is not an array");
            assert.isUndefined(req.properties, "properties is defined");
            assert.isUndefined(req.computedProperties, "computed properties is defined");
            assert.ok(req.returnData,"no return data defined");
            assert.ok(req.returnData.requestKey, "requestKey not found: " + sys.inspect(req.returnData));
          },
          
          'a fetch request containing the right relations': function(request){
            var rels, toOne, toMany;
            rels = request[0].fetch.relations;
            assert.length(rels,2);
            toOne = (rels[0].type === 'toOne')? rels[0]: rels[1];
            toMany = (rels[0].type === 'toMany')? rels[0]: rels[1];
            assert.ok(toOne,"there should be a toOne relation");
            assert.ok(toMany,"there should be a toMany relation");
            // this is something that should be tested somewhere else
            //assert.strictEqual(toOne.propertyName,'group');
            //assert.strictEqual(toOne.oppositeType: 'toMany');
          } 
        },
        
        'and adding sendProperties': {
          topic: function(t){
            t.sendProperties = true;
            return t;
          },
          
          'a remote request should send':{
            topic: function(t){ 
              var me = this;
              ThothSC.client.callback = function(args){ me.callback.call(me,null,args); };
              t.fetch(store,SC.Query.remote(ThothSC.Contact));
            },

            'a fetch request': function(request){
              //sys.log('request is: ' + sys.inspect(request));
              assert.ok(request[0].fetch);
            },

            'a fetch request containing the correct information': function(request){
              var req = request[0].fetch;
              assert.strictEqual('contact', req.bucket, "no bucket");
              assert.strictEqual('id',req.primaryKey, "no primaryKey value");
              assert.isUndefined(req.key, "key defined");
              assert.isArray(req.relations, "relations is not an array");
              assert.isArray(req.properties, "properties is not defined");
              assert.isUndefined(req.computedProperties, "computed properties is defined");
              assert.ok(req.returnData,"no return data defined");
              assert.ok(req.returnData.requestKey, "requestKey not found: " + sys.inspect(req.returnData));
            },
            
            'a fetch request containing the correct properties': function(request){
              var props = request[0].fetch.properties;
              assert.length(props,3);
            }          
          },
          
          'and adding sendComputedProperties': {
            topic: function(t){
              t.sendComputedProperties = true;
              return t;
            },
            
            'a remote request should send':{
              topic: function(t){ 
                var me = this;
                ThothSC.client.callback = function(args){ me.callback.call(me,null,args); };
                t.fetch(store,SC.Query.remote(ThothSC.Contact));
              },

              'a fetch request': function(request){
                //sys.log('request is: ' + sys.inspect(request));
                assert.ok(request[0].fetch);
              },

              'a fetch request containing the correct information': function(request){
                var req = request[0].fetch;
                assert.strictEqual('contact', req.bucket, "no bucket");
                assert.strictEqual('id',req.primaryKey, "no primaryKey value");
                assert.isUndefined(req.key, "key defined");
                assert.isArray(req.relations, "relations is not an array");
                assert.isArray(req.properties, "properties is not defined");
                assert.isArray(req.computedProperties, "computed properties is not defined");
                assert.ok(req.returnData,"no return data defined");
                assert.ok(req.returnData.requestKey, "requestKey not found: " + sys.inspect(req.returnData));
              },

              'a fetch request containing the correct computed properties': function(request){
                var props = request[0].fetch.computedProperties;
                assert.length(props,1);
              }
            }
          }
        }
      }
    }
  }
  
}).export(module);