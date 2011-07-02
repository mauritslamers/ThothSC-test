/*globals ThothSC global */

require('../SC/core');
require('../ThothSC');

ThothSC.Contact = SC.Record.extend({
  primaryKey: 'id',
  bucket: 'contact',
  firstname: SC.Record.attr(String),
  inbetween: SC.Record.attr(String),
  lastname: SC.Record.attr(String),
  group: SC.Record.toOne('ThothSC.Group', { oppositeProperty: 'contacts' }),
  addresses: SC.Record.toMany('ThothSC.Address', { oppositeProperty: 'contacts'}),
  
  fullname: SC.Record.attr(String, {
    isRemoteComputedProperty: true,
    computation: function(){
      var fn = this.get('firstname');
      var inb = this.get('inbetween');
      var ln = this.get('lastname');
      
      var ret = inb? [fn,inb,ln].join(" "): [fn,ln].join(" ");
      return ret;
    },
    
    dependencies: 'firstname inbetween lastname'.w()
  })
});

ThothSC.Group = SC.Record.extend({
  primaryKey: 'id',
  name: SC.Record.attr(String),
  contacts: SC.Record.toMany('ThothSC.Contact'),
  bucket: 'group'
});

ThothSC.Address = SC.Record.extend({
  firstline: SC.Record.attr(String),
  secondline: SC.Record.attr(String),
  city: SC.Record.attr(String),
  contacts: SC.Record.toMany('ThothSC.Contact', { oppositeProperty: 'addresses'})
});

ThothSC.fetchResult = {
  contact: [{ id: 1,
    firstname: 'Maurits',
    inbetween: null,
    lastname: 'Lamers',
    group: 1,
    addresses: [1,2]
    },
    { id: 2,
      firstname: 'Pietje',
      inbetween: 'van',
      lastname: 'Dalen',
      group: 2,
      addresses: [3]
    }
  ]
};

/*
schema:

                     ┌ ---------------------------------┐
                    1m                                  1
Student ∞m ---- ∞ Lesson 1m ---- 1m Course ∞m ---- ∞m Teacher
   ∞                1                 1                 1m
   │                |                 |                 |
   |                1m                |                 |
   └ -------- 1m Assignment  ∞m ------┘                 |
                    ∞m                                  |
                    └ ----------------------------------┘

*/


ThothSC.Student = SC.Record.extend({
  firstname: SC.Record.attr(String),
  inbetween: SC.Record.attr(String),
  lastname: SC.Record.attr(String),
  lessons: SC.Record.toMany('ThothSC.Lesson', { isMaster: true, oppositeProperty: 'students' }),
  assignments: SC.Record.toMany('ThothSC.Assignment', { isMaster: false, oppositeProperty: 'student'})
});

ThothSC.Course = SC.Record.extend({
  name: SC.Record.attr(String),
  year: SC.Record.attr(String),
  assignments: SC.Record.toMany('ThothSC.Assignment', { isMaster: false, oppositeProperty: 'course'}),
  lesson: SC.Record.toOne('ThothSC.Lesson', { isMaster: true, oppositeProperty: 'course'}), // rather unlikely but 1-1 for the sake of testing
  teachers: SC.Record.toMany('ThothSC.Teacher', { isMaster: true })
});

ThothSC.Teacher = SC.Record.extend({
  
});

ThothSC.Lesson = SC.Record.extend({
  
});

ThothSC.Assignment = SC.Record.extend({
  
});
