interface JumpNodeEntry<Key, Value> {
  key: Key;
  value: Value;
  jumpTable: JumpNodeTableNode<Key, Value>[];
  item?: () => JumpNode<Key, Value>;
}

export interface JumpNode<Key, Value> {
  key: Key;
  value: Value;
}

interface JumpNodeTableNode<Key, Value> {
  cnt: number;
  next: JumpNodeEntry<Key, Value>;
  prev: JumpNodeEntry<Key, Value>;
}

type CompareFn<Key> = (k1: Key, k2: Key) => number;

export type JumpForEachCallback<Key, Value> = (key: Key, value: Value, index: number) => boolean | void;
export type JumpMapCallback<Key, Value, Output> = (key: Key, value: Value) => Output;

export interface JumpOpts<Key> {
  genRate?: number;
  compareFunc?: CompareFn<Key>;
}

function defaultCompareFn<Key>(k1: Key, k2: Key): number {
  return k1 > k2 ? 1 : (k1 == k2 ? 0 : -1);
}

const defaultOpts = {
  "compareFunc": defaultCompareFn,
  "genRate": 0.25
};

export default class JumpList<Key = any, Value = any> {

  private root: JumpNodeEntry<Key, Value>;
  private genRate: number;
  private compare: CompareFn<Key>;

  constructor(opts?: JumpOpts<Key>) {

    opts = opts || {};

    this.compare = ("compareFunc" in opts) ? opts.compareFunc : defaultOpts.compareFunc;
    this.genRate = ("genRate" in opts) ? opts.genRate : defaultOpts.genRate;

    this.root = {
      key: null, 
      value: null,
      jumpTable: [],
    };
  }

  public size = () => {

    if(this.root.jumpTable.length > 0) {

      let highLevel = this.root.jumpTable.length - 1;
      let p = this.root;
      let sumCnt = 0;

      do {

        sumCnt += p.jumpTable[highLevel].cnt;
        p = p.jumpTable[highLevel].next;

      } while(this.valid(p));

      return sumCnt - 1;
    } else {

      return 0;
    }
  }

  public isEmpty(): boolean {
    return this.root.jumpTable.length < 1;
  }
  
  public getAt = (index: number): JumpNode<Key, Value> => {

    if(index < 0) {
      return null;
    }

    let level = this.root.jumpTable.length - 1;
    
    if(level < 0) {
      return null;
    }

    for(; level > 0 && this.root.jumpTable[level].cnt > index; level--) {}

    let rawNode = this.skip(
      this.root.jumpTable[level].next,
      index - this.root.jumpTable[level].cnt + 1,
      level,
    );

    if(rawNode) {
      return rawNode.item();
    }
  }
  
  public get = (key: Key): Value => {
    
    let node = this.getNode(key);

    if(node) {
      return node.value;
    }
  }
  
  public set = (key: Key, val: Value) => {

    let bounds = this.prevNodes(key);
    let keyNode: JumpNodeEntry<Key, Value> = createKeyNode(key);
    
    // Modify existing node or else add new one
    if(bounds.length > 0 && this.compareNode(bounds[0], keyNode) == 0) {

      bounds[0].value = val;
    } else {

      let node: JumpNodeEntry<Key, Value> = {
        key: key,
        value: val,
        jumpTable: [],
        item: function(): JumpNode<Key, Value> {
          return {
            "key": node.key,
            "value": node.value
          };
        }
      };

      let r = 1.0, level = 0;

      while(r > Math.random()) {

        // Insert a skip at a level
        let bound = bounds[level];
        let skip: JumpNodeTableNode<Key, Value> = {
          "cnt": 1,
          "next": null,
          "prev": null,
        };

        if(bound) {
          skip.next = bound.jumpTable[level].next;
          skip.prev = bound;

          if(skip.next) {
            skip.next.jumpTable[level].prev = node;
          }

          bound.jumpTable[level].next = node;
        } else {

          let rootSkip: JumpNodeTableNode<Key, Value> = {
            cnt: 1,
            next: node,
            prev: node
          };

          this.root.jumpTable.push(rootSkip);
          skip.next = this.root;
          skip.prev = this.root;
          bounds.push(this.root);
        }

        node.jumpTable.push(skip);
        r *= this.genRate;
        level++;
      }
  
      for(let level = 0; level < node.jumpTable.length; level++) {

        this.updateCount(node, level);
      }

      for(let level = 0; level < bounds.length; level++) {

        this.updateCount(bounds[level], level);
      }
    }
  }
  
  /**
   * Remove an element by key
   */
  public remove = (key) => {

    let keyNode: JumpNodeEntry<Key, Value> = createKeyNode(key);
    let bounds = this.prevNodes(key);
    
    if(bounds.length > 0 && this.compareNode(bounds[0], keyNode) == 0) {
      
      let node = bounds[0];

      for(let level=0; level<node.jumpTable.length; level++) {

        if(this.compareNode(bounds[level], keyNode) == 0) {

          bounds[level] = node.jumpTable[level].prev;
        }

        let next = node.jumpTable[level].next;
        let prev = node.jumpTable[level].prev;

        next.jumpTable[level].prev = prev;
        prev.jumpTable[level].next = next;
      }
  
      for(let level = this.root.jumpTable.length - 1; level >= 0; level--) {

        if(!this.valid(this.root.jumpTable[level].next)) {

          this.root.jumpTable.pop();
          bounds.pop();
        }
      }

      for(let level = 0; level < bounds.length; level++) {

        if(bounds[level]) {

          this.updateCount(bounds[level], level);
        }
      }

      return true;
    } else {

      return false;
    }
  }
  
  /**
   * Return a iterator of elems where startKey <= elem.key <= endKey
   * 
   */ 
  public range = (startKey: Key, endKey: Key, callback: JumpForEachCallback<Key, Value>) => {

    let node;

    if (this.isEmpty()) {
      return null;
    }

    let startKeyNode: JumpNodeEntry<Key, Value> = createKeyNode(startKey);
    let endKeyNode: JumpNodeEntry<Key, Value> = createKeyNode(endKey);

    if(this.compareNode(startKeyNode, endKeyNode) <= 0) {

      let bounds = this.prevNodes(startKey);

      if(bounds.length > 0) {

        node = this.compareNode(bounds[0], startKeyNode) == 0 ? bounds[0] : bounds[0].jumpTable[0].next;
      } else {

        node = this.root.jumpTable[0].next;
      }

      let count = 0;

      for(;node && this.compareNode(node, endKeyNode) <= 0; node = node.jumpTable[0].next) {

        if(false === callback(node.key, node.value, count++) || !this.valid(node.jumpTable[0].next)) {
          break;
        }
      }

    } else {

      let bounds = this.prevNodes(startKey);

      if(bounds.length > 0) {
        node = bounds[0];
      } else {
        return null;
      }

      let count = 0;

      for(; node && this.compareNode(node, endKeyNode) >= 0; node = node.jumpTable[0].prev) {

        if(false === callback(node.key, node.value, count++) || !this.valid(node.jumpTable[0].prev)) {
          break;
        }
      }    
    }
  }

  /** 
   * Gets all nodes with keys in [min, end]
   */
  public rangeUpper = (min, callback: JumpForEachCallback<Key, Value>) => {

    if (this.isEmpty()) {
      return null;
    }

    return this.range(min, this.tail().key, callback);
  }

  /**
   * Gets all nodes with keys in [begin, max]
   */
  public rangeLower = (max, callback: JumpForEachCallback<Key, Value>) => {

    if (this.isEmpty()) {
      return null;
    }

    this.range(this.head().key, max, callback);
  }
  
  public tail = (): JumpNode<Key, Value> => {

    let prev = this.root.jumpTable[0].prev;

    if(prev) {

      return prev.item();
    }

    return null;
  }
  
  public head = (): JumpNode<Key, Value> => {

    return this.root.jumpTable[0].next.item();
  }
  
  public forEach = (callback: JumpForEachCallback<Key, Value>) => {

    if(this.isEmpty()) {

      return null;
    }

    let p = this.root.jumpTable[0].next;
    let i = 0;

    while(this.valid(p)) {

      let r = callback(p.key, p.value, i++);

      if(r === false) {
        break;
      }

      p = p.jumpTable[0].next;
    }
  }
  
  public map = <Output>(callback: JumpMapCallback<Key, Value, Output>): Output[] => {

    let arr = [];

    this.forEach((key: Key, value: Value) => {

      let a = callback(key, value);
      arr.push(a);

      return true;
    });

    return arr;
  }
  
  public clear = (): void => {

    if(this.root.jumpTable.length < 1) {

      return;
    }

    let p = this.root.jumpTable[0].next;

    while(this.valid(p)) {
      
      let nextp = p.jumpTable[0].next;
      p.jumpTable = [];
      p = nextp;
    }

    this.root = {key: null, value: null, jumpTable:[]};
  }

  private compareNode = (n1: JumpNodeEntry<Key, Value>, n2: JumpNodeEntry<Key, Value>): number => {

    let node1IsRoot = n1 == this.root;
    let node2IsRoot = n2 == this.root;

    if(node1IsRoot && node2IsRoot) {

      return 0;
    } else if (node1IsRoot) {

      return -1;
    } else if (node2IsRoot) {

      return 1;
    } else {

      return this.compare(n1.key, n2.key);
    }
  }

  private valid = (node: JumpNodeEntry<Key, Value>): boolean => {

    return !!node && node != this.root;
  }

  private prevNode = (start: JumpNodeEntry<Key, Value>, level, targetNode: JumpNodeEntry<Key, Value>): JumpNodeEntry<Key, Value> => {
   
    if(this.compareNode(start, targetNode) > 0) {

      return null;
    }

    while(this.valid(start.jumpTable[level].next)) {
      
      if(this.compareNode(start.jumpTable[level].next, targetNode) > 0) {

	      return start;
      }

      start = start.jumpTable[level].next;
    }

    return start;
  }

  private prevNodes = (key: Key): JumpNodeEntry<Key, Value>[] => {

    var nodes: JumpNodeEntry<Key, Value>[] = [];
    let start = this.root;
    let keyNode: JumpNodeEntry<Key, Value> = createKeyNode(key);

    for(let level = this.root.jumpTable.length - 1; level >= 0; level--) {

      var prevNode = this.prevNode(start, level, keyNode);

      if(prevNode) {
	      nodes.push(prevNode);
      }
    }

    nodes = nodes.reverse();
    
    return nodes;
  }
  
  private updateCount = (node: JumpNodeEntry<Key, Value>, level: number) => {

    if(level == 0) {

      node.jumpTable[0].cnt = 1;
    } else {

      let sumCnt = 0;
      let next = node.jumpTable[level].next;
      let p = node;

      while(true) {

        if(this.valid(next) && this.compareNode(p, next) >= 0) {
          break;
        }

        sumCnt += p.jumpTable[level-1].cnt;
        p = p.jumpTable[level-1].next;

        if(!this.valid(p)) {
          break;
        }
      }

      node.jumpTable[level].cnt = sumCnt;
    }
  }

  public getNode = (key: Key): JumpNodeEntry<Key, Value> => {

    var bounds = this.prevNodes(key);
    let keyNode: JumpNodeEntry<Key, Value> = createKeyNode(key);

    if(bounds.length > 0 && this.compareNode(bounds[0], keyNode) == 0) {
      return Object.assign({}, bounds[0]);
    }
  }

  private skip = (node: JumpNodeEntry<Key, Value>, n: number, level: number): JumpNodeEntry<Key, Value> => {
    
    if(level == undefined) {
      level = this.root.jumpTable.length - 1;
    }

    let sumn = 0;
    
    while(true) {

      if(
        sumn + node.jumpTable[level].cnt < n ||
        (level == 0 && sumn + 1 == n)
      ) {

        sumn += node.jumpTable[level].cnt;
        node = node.jumpTable[level].next;

        if(!this.valid(node)) {

          break;
        }

      } else if(level == 0) {

	      return node;
      } else {

	      level--;
      }
    }
  }
}

function createKeyNode<Key, Value>(key: Key): JumpNodeEntry<Key, Value> {

  return {
    key,
    value: null,
    jumpTable: null
  };
}