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
      for(i=0,len=rels.length;i<len;i+=1){
        rec[rels[i].propertyName] = rels[i].keys;
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

The schema used:
                     ┌ ---------------------------------┐
                    1                                   ∞m
Student ∞ ---- ∞m Lesson 1m ---- 1m Course ∞m ---- ∞m Teacher
   ∞                1                 ∞                 ∞m
   │                |                 |                 |
   |                1m                |                 |
   └ -------- 1m Assignment  1m ------┘                 |
                    1m                                  |
                    └ ----------------------------------┘

This situation is a bit unlikely of course (a lesson and a course in a one-to-one relationship...)
but this is done just for testing purposes.

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

actions: 
first create a student, then create a lesson: the many to many side should update

//then create a lesson and add a different student: the many to many side should update
//then update the first lesson to contain the second student, the lessons of the second student should update
// these two cases are not valid, because the lesson is master, so all the updates will go through the master
// and the slave update has been shown already in the first test

(then delete the first student, the students in the first lesson should update (SC?))??


*/

vows.describe('relation testing').addBatch({
  'creating a student record (record without master relations) without relations': {
    topic: function(){
      ThothSC.client.callback = callbackCreator(this.callback);
      SC.RunLoop.begin();
      store.createRecord(ThothSC.Student, { firstname: 'Pietje', lastname: 'Puck' });
      store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should send a request': function(req){
      sys.log('request is: ' + sys.inspect(req,false,3));
      assert.ok(req);
    },
    
    'should result in': {
      topic: function(){
        return store.find(ThothSC.Student);
      },
      
      'a student record in the store': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'a student record in the store with empty toMany relations': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.isArray(rec.assignments);
        assert.isEmpty(rec.assignments);
        assert.isArray(rec.lessons);
        assert.isEmpty(rec.lessons);
      }
    }
  }
}).addBatch({
  'creating a lesson record (a record with a master toMany relation )': {
    topic: function(){
      ThothSC.client.callback = callbackCreator(this.callback);
      SC.RunLoop.begin();
      var stud = store.find(ThothSC.Student).get('firstObject');
      var rec = store.createRecord(ThothSC.Lesson,{ moment: new Date().toString() });
      rec.get('students').pushObject(stud);
      store.commitRecords();
      SC.RunLoop.end();
    },
    
    'should result in a send': function(req){
      assert.ok(req);
    },
    
    'should result in a lesson record': {
      topic: function(){
        return store.find(ThothSC.Lesson);
      },
      
      'being present': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'containing the right data': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.ok(rec);
        assert.ok(rec.moment);
        assert.isArray(rec.students);
        assert.length(rec.students,1);
        assert.equal(rec.students[0],1);
      }
    },
    
    'should result in a student record': {
      topic: function(){
        return store.find(ThothSC.Student);
      },
      
      'being still present': function(t){
        assert.equal(t.get('length'),1);
      },
      
      'having its relations updated': function(t){
        var rec = t.get('firstObject').get('attributes');
        assert.ok(rec);
        assert.isArray(rec.lessons);
        assert.length(rec.lessons,1);
        assert.equal(rec.lessons[0],1);
      }
    }
  }
}).addBatch({
  'creating a lesson record': {
    
  }
})


.export(module);


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