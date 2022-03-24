'use strict';
const assert = require("assert");
const JumpList = require("../dist/node/index").default;

JumpList.prototype.print = function() {

  let node = this.root;

  do {
    let s = node.key + ':' + node.value;

    for(let i=0; i<node.jumpTable.length; i++) {
      let skip = node.jumpTable[i];
      s += '\t\t' + (skip.prev?skip.prev.key:'') + ',' + (skip.next?skip.next.key:'') + ',c=' + skip.cnt;
    }

    console.info(s);
    node = node.jumpTable[0].next;
    
  } while(this.valid(node));
};
describe('JumpList', function(){
  
  it('many items', function() {

    let list = new JumpList();
    for(let i=0; i<1000; i++) {

      list.set(i, i+1000);
    }
    assert.equal(list.getAt(561).value, 1561);
    
    let ri = Math.floor(999 * Math.random());
    assert.equal(list.getAt(ri).value, ri+1000);

    list.remove(ri);
    assert.equal(list.getAt(ri).value, ri+1001);
  });

  it('should have alphabetic orders', function() {
    let list = new JumpList();
    list.set('b', 3);
    list.set('a', 5);

    assert.equal(list.get('b'), 3);
    assert.equal(list.getAt(0).key, 'a');
    assert.equal(list.getAt(0).value, 5);

    assert.equal(list.size(), 2);
  });

  it('should delete', function() {
    let list = new JumpList();

    list.set('b', 3);
    list.set('a', 5);
    list.set('c', 10);

    assert.equal(list.size(), 3);
    assert.equal(list.getAt(0).key, 'a');

    list.remove('b');

    assert.equal(list.size(), 2);
    assert.equal(list.getAt(0).key, 'a');
    assert.equal(list.getAt(1).key, 'c');
    assert.equal(list.getAt(1).value, 10);

    list.set('d', 17);
    assert.equal(list.getAt(2).key, 'd');

    list.remove('e');
    assert.equal(list.getAt(2).key, 'd');

    let arr = list.map(function(k, v) {
      return k;
    });
    assert.deepEqual(arr, ['a', 'c', 'd']);

    list.clear();
    assert.equal(list.size(), 0);
  });

  it('void list', function() {
    let list = new JumpList();
    assert.equal(list.size(), 0);
    assert.ok(!list.getAt(100));
    assert.deepEqual(list.map(function(k, v){return v;}), []);
  });

  it('Range should not do anything with empty JumpList', function() {
    let list = new JumpList();
    assert.equal(list.size(), 0);

    let didSomething = false;

    list.range(0, 0, function() {
      didSomething = true;
    });

    assert.ok(!didSomething);

    list.range(0, 1, function() {
      didSomething = true;
    });

    assert.ok(!didSomething);
  });

  it('Range should do something with non-empty JumpList', function() {
    let list = new JumpList();

    list.set(10, "Promises");

    assert.equal(list.size(), 1);

    let didSomething = false;

    list.range(0, 1, function() {
      didSomething = true;
    });

    assert.ok(!didSomething);

    didSomething = false;
    
    list.range(5, 50, function() {
      didSomething = true;
    });

    assert.ok(didSomething);
  });

  it('.range should select correct ranges on non-empty JumpList', function() {
    let list = new JumpList();

    list.set(10, "Promises");
    list.set(20, "LOVE U");
    list.set(30, "HIP HOP");
    list.set(40, "Cowboy BEEBOP");
    list.set(50, "YIKYAK");
    list.set(60, "MiikMAK");

    assert.equal(list.size(), 6);

    let count = 0;

    list.range(10, 20, function() {
      count++;
    });

    assert.strictEqual(2, count);
    
    list.range(30, 60, function() {
      count++;
    });

    assert.strictEqual(6, count);
    
    list.range(60, 30, function() {
      count++;
    });

    assert.strictEqual(10, count);
  });

  it('.rangeLower should select correct lower range on non-empty JumpList', function() {
    let list = new JumpList();

    list.set(10, "Promises");
    list.set(20, "LOVE U");
    list.set(30, "HIP HOP");
    list.set(40, "Cowboy BEEBOP");
    list.set(50, "YIKYAK");
    list.set(60, "MiikMAK");

    assert.equal(list.size(), 6);

    let count = 0;

    list.rangeLower(21, function() {
      count++;
    });

    assert.strictEqual(2, count);
    
    list.rangeLower(55, function() {
      count++;
    });

    assert.strictEqual(7, count);
  });

  it('.rangeUpper should select correct upper range on non-empty JumpList', function() {
    let list = new JumpList();

    list.set(10, "Promises");
    list.set(20, "LOVE U");
    list.set(30, "HIP HOP");
    list.set(40, "Cowboy BEEBOP");
    list.set(50, "YIKYAK");
    list.set(60, "MiikMAK");

    assert.equal(list.size(), 6);

    let count = 0;

    list.rangeUpper(25, function() {
      count++;
    });

    assert.strictEqual(4, count);
    
    list.rangeUpper(9, function() {
      count++;
    });

    assert.strictEqual(10, count);
  });
});
