/*globals global ThothSC process*/

var vows = require('vows'),
    assert = require("assert"),
    sys = require('sys'),
    repl = require('repl'),
    ds, store;

require('../SC/core');
require('../ThothSC');
require('./test_data');

//this inversetest is to check whether the SC inverse setting actually works...
//with push stuff

ThothSC.Model24 = SC.Record.extend({
  primaryKey: 'id',
  name: SC.Record.attr(String),
  toSlave: SC.Record.toOne('ThothSC.Model25', { isMaster: true, inverse: 'toMaster'})
});

ThothSC.Model25 = SC.Record.extend({
  primaryKey: 'id',
  nameTwo: SC.Record.attr(String),
  toMaster: SC.Record.toMany('ThothSC.Model24', { isMaster: false })
});

ThothSC.TestDataSource = ThothSC.DataSource.extend({
  connectUsing: ThothSC.FAKE, 
  sendRelations: true,
  sendProperties: true,
  useAuthentication: false
});

store = SC.Store.create({ commitRecordsAutomatically: false }).from('ThothSC.TestDataSource');
store._getDataSource();
ThothSC.client.isConnected = true;

var callbackCreator = function(callback,recordData){
  var ret = function(reqs){
    //sys.log('thoth client called with request: ' + sys.inspect(reqs,false,4));
    var bucketIdCounter = {},
        request = reqs[0],
        bucket,key,rec,i,len,rels;
    
    if(request.createRecord){
      bucket = request.createRecord.bucket;
      if(!bucketIdCounter[bucket]) bucketIdCounter[bucket] = 1;
      //sys.log('sending message back...');
      key = bucketIdCounter[bucket];
      rec = request.createRecord.record;
      rec['id'] = key;
      rels = request.createRecord.relations;
      if(rels){
        for(i=0,len=rels.length;i<len;i+=1){
          rec[rels[i].propertyName] = rels[i].keys;
        }
      }
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

vows.describe('inverse testing').addBatch({

  'pushing two records of the two models': {
    topic: function(){
      SC.RunLoop.begin();
      store.pushRetrieve(ThothSC.Model25,1,{ id: 1, name:'pietje', toMaster: []});
      store.pushRetrieve(ThothSC.Model24,1,{ id: 1, name:'puck', toSlave: 1});
      store.flush();
      SC.RunLoop.end();
      return store.find(ThothSC.Model25);
    },
    
    'should result in the relation not being updated': function(t){
      var rec = t.get('firstObject');
      assert.ok(rec);
      assert.equal(rec.get('toMaster').get('length'),0,"the inverse has starting updating on push...");
    }
  }
}).export(module);
