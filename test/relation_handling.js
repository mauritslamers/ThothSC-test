/*globals global ThothSC process*/

var vows = require('vows'),
    assert = require("assert"),
    sys = require('sys'),
    repl = require('repl'),
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
ThothSC.client.isConnected = true;

var callbackCreator = function(callback,recordData){
  var ret = function(reqs){
    //sys.log('thoth client called with request: ' + sys.inspect(reqs,false,4));
    var bucketIdCounter = {},
        request = reqs[0],
        bucket,key,rec;
    
    if(request.createRecord){
      bucket = request.createRecord.bucket;
      if(!bucketIdCounter[bucket]) bucketIdCounter[bucket] = 1;
      //sys.log('sending message back...');
      key = bucketIdCounter[bucket];
      rec = request.createRecord.record;
      rec['id'] = key;
      ThothSC.client.messageHandler({ data: { createRecordResult: { 
          bucket: bucket,
          key: key,
          record: rec,
          returnData: request.createRecord.returnData
        }
      }});
      bucketIdCounter += 1;
      callback(null,request);
    }
    if(request.updateRecord){
      ThothSC.client.messageHandler({ data: { updateRecordResult: 
        { bucket: request.updateRecord.bucket,
          key: request.updateRecord.key,
          record: request.updateRecord.record,
          returnData: request.updateRecord.returnData }}});
      callback(null,request);
    }
    if(request.refreshRecord){
      ThothSC.client.messageHandler({data: { refreshRecordResult: {
        bucket: request.refreshRecord.bucket,
        key: request.refreshRecord.key,
        record: recordData,
        returnData: request.refreshRecord.returnData
      }}});
      callback(null,request);
    }
    if(request.deleteRecord){
      ThothSC.client.messageHandler({ data: { deleteRecordResult: {
        bucket: request.deleteRecord.bucket,
        key: request.deleteRecord.key,
        returnData: request.deleteRecord.returnData
      }}});
      callback(null,request);
    }
    //else sys.log('no request found...');
  };
  return ret;
};

/*
Testing:

toOne 
toMany
isMaster
isChildRecord
oppositeProperty
(isDirectRelation)
(key)

one-to-one with one master 
one-to-one with two masters
one-to-many with one master at one
one-to-many with one master at many
one-to-many with two masters
many-to-many with one master
many-to-many with two masters

What should ThothSC do:
- when only one side of a relation is master, the opposite (slave) side should be updated, but not the other way around
- when there are two masters, both sides should update one another

the procedures to check are: 
- create
- refresh (something has changed on the server side)
- update
- delete
- pushCreate
- pushUpdate
- pushDelete

The only outsider is 'isChildRecord' which causes ThothSC to include a record hash instead of an id.
TODO: what should ThothSC do with it exactly? same as normal? probably yes...

*/




vows.describe('relation testing').addBatch({
  
  
  
}).export(module);


/*
.addBatch({
  'pushing in a record with relations': {
    topic: function(){
      ThothSC.client.messageHandler({data: { createRecord: {
        bucket: 'group',
        key: 1,
        record: { name: 'testgroup'},
        relations: [ { propertyName: 'contacts', type: 'toMany', keys: [1] } ]
      }}});
      return true;
    },
    
    'should result in': {
      topic: function(){
        return store.find(ThothSC.Group);
      },
      
      'a record in the store': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'the correct datahash': function(t){
        var sK = t.get('firstObject').get('storeKey');
        var hash = store.readDataHash(sK);
        assert.deepEqual(hash,{name:'testgroup',contacts:[1]});
      },
      
      'getting the relation':{
        topic: function(t){
          ThothSC.client.callback = callbackCreator(this.callback, { id: 1, firstname: 'me', lastname: 'too'});
          SC.RunLoop.begin();
          var s = t.get('firstObject').get('contacts').get('firstObject');
          //sys.log('contacts is: ' + sys.inspect(s.get('firstObject')));
          SC.RunLoop.end();
        },
        
        'should try to get the relation data': function(req){
          assert.ok(req);
        },
        
        'and afterwards the relation': {
          topic: function(req,t){
            
            return t.get('firstObject').get('contacts');
          },
          
          'should be there': function(rel){
            assert.ok(SC.instanceOf(rel,SC.ManyArray));
          },
          
          'should contain the correct number of records': function(rel){
            assert.equal(rel.get('length'),1);
          },
          
          'should contain the correct record': function(rel){
            assert.deepEqual(rel.get('firstObject').get('attributes'),{ id: 1, firstname: 'me', lastname: 'too'});
          },
          
          'should also be visible on the other side': function(rel){
            var opp = rel.get('firstObject').get('group');
            assert.equal(opp,1);
          }
        }
      }
    }
  }
})
*/