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


vows.describe('Store interactions').addBatch({
  'checking correct state of kit': {
    'client':{
      topic: ThothSC.client,
      
      'should be connected': function(t){
        assert.ok(t.isConnected);
      },
      
      'should have 13 data handlers': function(t){
        var len = t._dataMessageHandlers.length;
        var msg = "there seem to be ";
        msg += (len > 13)? "more": "less";
        msg += " handlers than expected. Expected 13, got " + len;
        assert.equal(len,13,msg);
      }
    }
  }
}).addBatch({
  'creating a new record': {
    
    topic: function(){
      //sys.log('creating record');
      SC.RunLoop.begin();
      ThothSC.client.callback = callbackCreator(this.callback);
      store.createRecord(ThothSC.Group, { name: 'testgroup' });
      //store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should result in a send': function(request){
      SC.RunLoop.begin();
      assert.ok(request);
      SC.RunLoop.end();
    }
  }
}).addBatch({
  'after creating a record': {
    
    topic: store,
    
    'the store should contain': {
      topic: function(store){
        return store.find(ThothSC.Group);
      },
      
      'one record of the correct type': function(recs){
        assert.equal(recs.get('length'),1);
      },
      
      'one record containing the proper data': function(recs){
        var t = recs.get('firstObject');
        //sys.log('t: '  + sys.inspect(t.get('storeKey')));
        assert.ok(t);
        assert.equal(t.get('id'),1,"the store did not update the primary key correctly");
        assert.equal(t.get('name'),'testgroup', "the store did not update the content correctly");
      }
    }
  }
}).addBatch({
  'trying to refresh the record': {
    topic: function(){
      SC.RunLoop.begin();
      var rec = store.find(ThothSC.Group).get('firstObject');
      ThothSC.client.callback = callbackCreator(this.callback,rec.get('attributes'));
      rec.refresh();
    },
    
    'should result in a send': function(request){
      assert.ok(request);
    }
  }
}).addBatch({
  'updating the existing record': {
    
    topic: function(){
      //sys.log('creating record');
      SC.RunLoop.begin();
      ThothSC.client.callback = callbackCreator(this.callback);
      var rec = store.find(ThothSC.Group).get('firstObject');
      rec.set('name','myTestGroup');
      //store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should result in a send': function(req){
      assert.ok(req,'update does not seem to send an update');
    }
  }
}).addBatch({
  'after the update': {
    topic: function(){
      return store.find(ThothSC.Group).get('firstObject');
    },
    
    'the record should be updated': function(rec){
      assert.equal(rec.get('name'),'myTestGroup','the store does not seem to have updated the record');
    }
  }
}).addBatch({
  'deleting a record':{
    topic: function(){
      SC.RunLoop.begin();
      ThothSC.client.callback = callbackCreator(this.callback);
      var rec = store.find(ThothSC.Group).get('firstObject');
      rec.destroy();
      SC.RunLoop.end();
    },
    
    'should result in a send': function(req){
      assert.ok(req);
    }
  }
}).addBatch({
  'after deletion': {
    topic: function(){
      return store.find(ThothSC.Group);
    },
    
    'no record should be found': function(ret){
      assert.equal(ret.get('length'),0);
    }
  }
}).addBatch({
  
  'pushing in': {
    topic: function(){
      store.dataSource._store = store;
      ThothSC.client.messageHandler({data: { createRecord: {
        bucket: 'group',
        key: 1,
        record: { name: 'testgroup'}
      }}});
      return true;
    },
    
    'should create': {
      topic: function(){
        return store.find(ThothSC.Group);
      },
      
      'a record in the store': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'a record with the correct information': function(t){
        var rec = t.get('firstObject');
        assert.equal(rec.get('id'),1);
        assert.equal(rec.get('name'),'testgroup');
      }   
    }
  }
}).addBatch({
  
  'updating by push': {
    topic: function(){
      ThothSC.client.messageHandler({data: { updateRecord: {
        bucket: 'group',
        key: 1,
        record: { name: 'myTestGroup'}
      }}});
      return true;
    },
    
    'should': {
      topic: function(){
        return store.find(ThothSC.Group);
      },
      
      'not create more records': function(t){
        assert.equal(t.get('length'),1,"pushUpdate causes record creation or deletion? number of records " + t.get('length'));
      },
      
      'update the record': function(t){
        var rec = t.get('firstObject');
        assert.equal(rec.get('name'),'myTestGroup');
      }
    } 
  }
}).addBatch({
  'deletion by push': {
    topic: function(){
      ThothSC.client.messageHandler({data: { deleteRecord: {
        bucket: 'group',
        key: 1,
        record: { name: 'myTestGroup'}
      }}});
      return true;
    },
    
    'should': {
      topic: function(){
        return store.find(ThothSC.Group);
      },
      
      'destroy the given record': function(t){
        assert.equal(t.get('length'),0);
      }
    }
  }
})
.export(module);

/*ThothSC.Address = SC.Record.extend({
  firstline: SC.Record.attr(String),
  secondline: SC.Record.attr(String),
  city: SC.Record.attr(String),
  contacts: SC.Record.toMany('ThothSC.Contact', { oppositeProperty: 'addresses'})
}); */