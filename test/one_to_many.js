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
        originalRequest = reqs[0],
        request = ThothSC.copy(reqs[0]),
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
      callback(null,originalRequest);
    }
    if(request.updateRecord){
      ThothSC.client.messageHandler({ data: { updateRecordResult: 
        { bucket: request.updateRecord.bucket,
          key: request.updateRecord.key,
          record: request.updateRecord.record,
          returnData: request.updateRecord.returnData }}});
      callback(null,originalRequest);
    }
    if(request.refreshRecord){
      ThothSC.client.messageHandler({data: { refreshRecordResult: {
        bucket: request.refreshRecord.bucket,
        key: request.refreshRecord.key,
        record: recordData,
        returnData: request.refreshRecord.returnData
      }}});
      callback(null,originalRequest);
    }
    if(request.deleteRecord){
      ThothSC.client.messageHandler({ data: { deleteRecordResult: {
        bucket: request.deleteRecord.bucket,
        key: request.deleteRecord.key,
        returnData: request.deleteRecord.returnData
      }}});
      callback(null,originalRequest);
    }
    //else sys.log('no request found...');
  };
  return ret;
};

/*
All options for one-to-many
one_m-to-many_m
one_m-to-many
one-to-many_m
one-to-many (should be left alone)


*/

ThothSC.ModelThree = SC.Record.extend({
  primaryKey: 'id',
  resource: 'three',
  name: SC.Record.attr(String),
  toFourManyBothMaster: SC.Record.toMany('ThothSC.ModelFour', { isMaster: true, oppositeProperty: 'toThreeBothMaster'}),
  toFourManyMaster: SC.Record.toMany('ThothSC.ModelFour', { isMaster: true, oppositeProperty: 'toThreeSlave' }),
  toFourManySlave: SC.Record.toMany('ThothSC.ModelFour', { isMaster: false, oppositeProperty: 'toThreeMaster'}),
  toFourManyBothSlave: SC.Record.toMany('ThothSC.ModelFour', { isMaster: false, oppositeProperty: 'toThreeBothSlave'})
});

ThothSC.ModelFour = SC.Record.extend({
  primaryKey: 'id',
  resource: 'four',  
  name: SC.Record.attr(String),
  toThreeBothMaster: SC.Record.toOne('ThothSC.ModelThree', { isMaster: true, oppositeProperty: 'toFourManyBothMaster'}),
  toThreeSlave: SC.Record.toOne('ThothSC.ModelThree', { isMaster: false, oppositeProperty: 'toFourManyMaster'}),
  toThreeMaster: SC.Record.toOne('ThothSC.ModelThree', { isMaster: true, oppositeProperty: 'toFourManySlave'}),
  toThreeBothSlave: SC.Record.toOne('ThothSC.ModelThree', { isMaster: false, oppositeProperty: 'toFourManyBothSlave'})
});

vows.describe('one-to-many relation testing').addBatch({
  'creating a ModelThree record without relations': {
    topic: function(){
      ThothSC.client.callback = callbackCreator(this.callback);
      SC.RunLoop.begin();
      store.createRecord(ThothSC.ModelThree, { name: 'Pietje' });
      store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should send a correct request': function(req){
      sys.log('request is: ' + sys.inspect(req,false,3));
      var cr = req.createRecord;
      assert.ok(req, "no request detected");
      assert.ok(cr, "no createrecord object detected");
      assert.ok(cr.properties, "no properties detected in request");
      assert.length(cr.properties,1,"the number of properties in the request is not correct");
      assert.ok(cr.relations, "no relations found in the request");
      assert.length(cr.relations,4,"the number of relations in the request is not correct");
    },
          
    'should result in': {
      topic: function(){
        return store.find(ThothSC.ModelThree);
      },
      
      'a record in the store': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'a record in the store with empty relations': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.isUndefined(rec.toFourBothMaster);
        assert.isUndefined(rec.toFourMaster);
        assert.isUndefined(rec.toFourSlave);
        assert.isUndefined(rec.toFourBothSlave);
      }
    }
  }
})
.addBatch({
  'creating a ModelFour record with relations': {
    topic: function(){
      ThothSC.client.callback = callbackCreator(this.callback);
      SC.RunLoop.begin();
      var modThree = store.find(ThothSC.ModelThree).get('firstObject');
      var rec = store.createRecord(ThothSC.ModelFour,{ name: 'Puck'});
      rec.set('toThreeBothMaster',modThree);
      rec.set('toThreeSlave',modThree);
      rec.set('toThreeMaster',modThree);
      rec.set('toThreeBothSlave',modThree);
      store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should send a correct request': function(req){
      sys.log('request is: ' + sys.inspect(req,false,3));
      var cr = req.createRecord;
      assert.ok(req, "no request detected");
      assert.ok(cr, "no createrecord object detected");
      assert.ok(cr.properties, "no properties detected in request");
      assert.length(cr.properties,1,"the number of properties in the request is not correct");
      assert.ok(cr.relations, "no relations found in the request");
      assert.length(cr.relations,4,"the number of relations in the request is not correct");
    },
    
    'should result in a ModelFour record': {
      topic: function(){
        return store.find(ThothSC.ModelFour);
      },
      
      'being present': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'containing the right data': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.ok(rec,"no record found");
        assert.isEmpty(rec.toThreeBothMaster,"toThreeBothMaster data found while not expected");
        assert.isEmpty(rec.toThreeSlave,"toThreeSlave data found, while not expected");
        assert.length(rec.toThreeMaster,1,"toThreeMaster data not found");
        assert.isEmpty(rec.toThreeBothSlave,"toThreeBothSlave data found while not expected");
      }
    },
    
    'should result in a ModelThree record': {
      topic: function(){
        return store.find(ThothSC.ModelThree);
      },
      
      'being still present': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'having its relations updated': function(t){
        var rec = t.get('firstObject').get('attributes');
        //sys.log('relations: ' + sys.inspect(ThothSC.modelCache._modelGraphCache.lesson._relations));
        assert.ok(rec);
        sys.log('attrs: ' + sys.inspect(rec));
        assert.isUndefined(rec.toFourBothMaster);
        assert.equal(rec.toFourMaster,1);
        assert.isUndefined(rec.toFourSlave);
        assert.equal(rec.toFourBothSlave,1);
      }
    }
  }
})
/*.addBatch({
  'deleting a record': {
    topic: function(){
      ThothSC.client.callback = callbackCreator(this.callback);
      SC.RunLoop.begin();
      var rec = store.find(ThothSC.ModelOne,1);
      rec.destroy();
      store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should result in a correct request': function(req){
      sys.log('request: ' + sys.inspect(req));
      assert.ok(req);
    },
        
    'should result': {
      topic: function(){
        return store.find(ThothSC.ModelOne);
      },
      
      'in the record being destroyed': function(t){
        assert.ok(t);
        assert.equal(t.get('length'),0);
      }
    },
    
    'should result in the relationships': {
      topic: function(){
        return store.find(ThothSC.ModelTwo);
      },
      
      'being updated': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.ok(rec, 'record of modelTwo no longer found');
        sys.log('attrs: ' + sys.inspect(rec));
        assert.equal(rec.toOneMaster,1, "toOneMaster should not have been updated");
        assert.isNull(rec.toOneSlave, "toOneSlave should have been updated and set to undefined");
        assert.equal(rec.toOneMasterForcedInclusion,1, "toMasterForcedInclusion should not have been touched");
        assert.isNull(rec.toOneMasterForcedUpdate,"toOneMasterForcedUpdate should have been set to undefined");
      }
    }
    
  }
})*/
.export(module);
