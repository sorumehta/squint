// @ts-check
export function _PLUS_(...xs) {
  return xs.reduce((x, y) => x + y, 0);
}

export function _(...xs) {
  return xs.reduce((x, y) => x - y);
}

export function satisfies_QMARK_(protocol, x) {
  return x[protocol];
}

export function assoc_BANG_(m, k, v, ...kvs) {
  if (kvs.length % 2 !== 0) {
    throw new Error('Illegal argument: assoc expects an odd number of arguments.');
  }

  switch (typeConst(m)) {
    case MAP_TYPE:
      m.set(k, v);

      for (let i = 0; i < kvs.length; i += 2) {
        m.set(kvs[i], kvs[i + 1]);
      }
      break;
    case ARRAY_TYPE:
    case OBJECT_TYPE:
      m[k] = v;

      for (let i = 0; i < kvs.length; i += 2) {
        m[kvs[i]] = kvs[i + 1];
      }
      break;
    default:
      throw new Error(
        'Illegal argument: assoc! expects a Map, Array, or Object as the first argument.'
      );
  }

  return m;
}

function copy(o) {
  switch (typeConst(o)) {
    case MAP_TYPE:
      return new Map(o.entries());
    case ARRAY_TYPE:
      return [...o];
    case OBJECT_TYPE:
      return { ...o };
    default:
      throw new Error(`Don't know how to copy object of type ${typeof o}.`);
  }
}

export function assoc(o, k, v, ...kvs) {
  if (!o) {
    o = {};
  }
  let ret = copy(o);
  assoc_BANG_(ret, k, v, ...kvs);
  return ret;
}

const MAP_TYPE = 1;
const ARRAY_TYPE = 2;
const OBJECT_TYPE = 3;
const LIST_TYPE = 4;
const SET_TYPE = 5;
const LAZY_ITERABLE_TYPE = 6;

function emptyOfType(type) {
  switch (type) {
    case MAP_TYPE:
      return new Map();
    case ARRAY_TYPE:
      return [];
    case OBJECT_TYPE:
      return {};
    case LIST_TYPE:
      return new List();
    case SET_TYPE:
      return new Set();
    case LAZY_ITERABLE_TYPE:
      return lazy(function* () {
        return;
      });
  }
  return undefined;
}

function isObj(coll) {
  return (coll.constructor === Object);
}

export function object_QMARK_(coll) {
  return (coll != null && isObj(coll));
}

function typeConst(obj) {
  if (obj == null) {
    return undefined;
  }
  // optimize for object
  if (isObj(obj)) {
    return OBJECT_TYPE;
  }
  if (obj instanceof Map) return MAP_TYPE;
  if (obj instanceof Set) return SET_TYPE;
  if (obj instanceof List) return LIST_TYPE;
  if (obj instanceof Array) return ARRAY_TYPE;
  if (obj instanceof LazyIterable) return LAZY_ITERABLE_TYPE;
  if (obj instanceof Object) return OBJECT_TYPE;
  return undefined;
}

function assoc_in_with(f, fname, o, keys, value) {
  let baseType = typeConst(o);
  if (baseType !== MAP_TYPE && baseType !== ARRAY_TYPE && baseType !== OBJECT_TYPE)
    throw new Error(
      `Illegal argument: ${fname} expects the first argument to be a Map, Array, or Object.`
    );

  const chain = [o];
  let lastInChain = o;

  for (let i = 0; i < keys.length - 1; i += 1) {
    let k = keys[i];
    let chainValue;
    if (lastInChain instanceof Map) chainValue = lastInChain.get(k);
    else chainValue = lastInChain[k];
    if (!chainValue) {
      chainValue = emptyOfType(baseType);
    }
    chain.push(chainValue);
    lastInChain = chainValue;
  }

  chain.push(value);

  for (let i = chain.length - 2; i >= 0; i -= 1) {
    chain[i] = f(chain[i], keys[i], chain[i + 1]);
  }

  return chain[0];
}

export function assoc_in(o, keys, value) {
  return assoc_in_with(assoc, 'assoc-in', o, keys, value);
}

export function assoc_in_BANG_(o, keys, value) {
  var currObj = o;
  let baseType = typeConst(o);
  for (const k of keys.splice(0,keys.length - 1)) {
    let v = get(currObj, k);
    if (v === undefined) {
      v = emptyOfType(baseType);
      assoc_BANG_(currObj, k, v);
    }
    currObj = v;
  }
  assoc_BANG_(currObj, keys[keys.length - 1], value);
  return o;
}

export function comp(...fs) {
  if (fs.length === 0) {
    return identity;
  } else if (fs.length === 1) {
    return fs[0];
  }
  let [f, ...more] = fs.slice().reverse();
  return function (...args) {
    let x = f(...args);
    for (const g of more) {
      x = g(x);
    }
    return x;
  };
}

export function conj_BANG_(...xs) {
  if (xs.length === 0) {
    return vector();
  }

  let [o, ...rest] = xs;

  if (o === null || o === undefined) {
    o = [];
  }

  switch (typeConst(o)) {
    case SET_TYPE:
      for (const x of rest) {
        o.add(x);
      }
      break;
    case LIST_TYPE:
      o.unshift(...rest.reverse());
      break;
    case ARRAY_TYPE:
      o.push(...rest);
      break;
    case MAP_TYPE:
      for (const x of rest) {
        if (!(x instanceof Array))
          iterable(x).forEach((kv) => {
            o.set(kv[0], kv[1]);
          });
        else o.set(x[0], x[1]);
      }
      break;
    case OBJECT_TYPE:
      for (const x of rest) {
        if (!(x instanceof Array)) Object.assign(o, x);
        else o[x[0]] = x[1];
      }
      break;
    default:
      throw new Error(
        'Illegal argument: conj! expects a Set, Array, List, Map, or Object as the first argument.'
      );
  }

  return o;
}

export function conj(...xs) {
  if (xs.length === 0) {
    return vector();
  }

  let [o, ...rest] = xs;

  if (o === null || o === undefined) {
    o = [];
  }

  switch (typeConst(o)) {
    case SET_TYPE:
      return new Set([...o, ...rest]);
    case LIST_TYPE:
      return new List(...rest.reverse(), ...o);
    case ARRAY_TYPE:
      return [...o, ...rest];
    case MAP_TYPE:
      const m = new Map(o);

      for (const x of rest) {
        if (!(x instanceof Array))
          iterable(x).forEach((kv) => {
            m.set(kv[0], kv[1]);
          });
        else m.set(x[0], x[1]);
      }

      return m;
    case LAZY_ITERABLE_TYPE:
      return lazy(function* () {
        yield* rest;
        yield* o;
      });
    case OBJECT_TYPE:
      const o2 = { ...o };

      for (const x of rest) {
        if (!(x instanceof Array)) Object.assign(o2, x);
        else o2[x[0]] = x[1];
      }

      return o2;
    default:
      throw new Error(
        'Illegal argument: conj expects a Set, Array, List, Map, or Object as the first argument.'
      );
  }
}

export function disj_BANG_(s, ...xs) {
  for (const x of xs) {
    s.delete(x);
  }
  return s;
}

export function disj(s, ...xs) {
  let s1 = new Set([...s]);
  return disj_BANG_(s1, ...xs);
}

export function contains_QMARK_(coll, v) {
  switch (typeConst(coll)) {
    case SET_TYPE:
    case MAP_TYPE:
      return coll.has(v);
    case undefined:
      return false;
    default:
      return v in coll;
  }
}

export function dissoc_BANG_(m, ...ks) {
  for (const k of ks) {
    delete m[k];
  }

  return m;
}

export function dissoc(m, ...ks) {
  let m2 = { ...m };

  for (const k of ks) {
    delete m2[k];
  }

  return m2;
}

export function inc(n) {
  return n + 1;
}

export function dec(n) {
  return n - 1;
}

export function println(...args) {
  console.log(...args);
}

export function nth(coll, idx, orElse) {
  if (coll) {
    var elt = undefined;
    if (coll instanceof Array) {
      elt = coll[idx];
    } else {
      let iter = iterable(coll);
      let i = 0;
      for (let value of iter) {
        if (i++ == idx) {
          elt = value;
          break;
        }
      }
    }
    if (elt !== undefined) {
      return elt;
    }
  }
  return orElse;
}

export function get(coll, key, otherwise = undefined) {
  if (coll == null) {
    return otherwise;
  }
  let v;
  // optimize for getting values out of objects
  if (isObj(coll)) {
    v = coll[key];
    if (v === undefined) {
      return otherwise;
    } else {
      return v;
    }
  }
  switch (typeConst(coll)) {
    case SET_TYPE:
      if (coll.has(key)) v = key;
      break;
    case MAP_TYPE:
      v = coll.get(key);
      break;
    case undefined:
      break;
    default:
      v = coll[key];
      break;
  }
  return v !== undefined ? v : otherwise;
}

export function seqable_QMARK_(x) {
  // String is iterable but doesn't allow `m in s`
  return (
    typeof x === 'string' ||
    x === null ||
    x === undefined ||
    (x instanceof Object && Symbol.iterator in x)
  );
}

export function iterable(x) {
  // nil puns to empty iterable, support passing nil to first/rest/reduce, etc.
  if (x === null || x === undefined) {
    return [];
  }
  if (seqable_QMARK_(x)) {
    return x;
  }
  return Object.entries(x);
}

export const IIterable = Symbol('Iterable');

export const IIterable__iterator = Symbol.iterator;

export function _iterator(coll) {
  return coll[Symbol.iterator]();
}

export const es6_iterator = _iterator;

export function seq(x) {
  let iter = iterable(x);
  // return nil for terminal checking
  if (iter.length === 0 || iter.size === 0) {
    return null;
  }
  return iter;
}

export function first(coll) {
  // destructuring uses iterable protocol
  let [first] = iterable(coll);
  return first;
}

export function second(coll) {
  let [_, v] = iterable(coll);
  return v;
}

export function ffirst(coll) {
  return first(first(coll));
}

export function rest(coll) {
  return lazy(function* () {
    let first = true;
    for (const x of iterable(coll)) {
      if (first) first = false;
      else yield x;
    }
  });
}

class Reduced {
  value;
  constructor(x) {
    this.value = x;
  }
  _deref() {
    return this.value;
  }
}

export function last(coll) {
  coll = iterable(coll);
  switch (typeConst(coll)) {
    case ARRAY_TYPE:
      return coll[coll.length - 1];
    default:
      let lastEl;
      for (const x of coll) {
        lastEl = x;
      }
      return lastEl;
  }
}

export function reduced(x) {
  return new Reduced(x);
}

export function reduced_QMARK_(x) {
  return x instanceof Reduced;
}

export function reduce(f, arg1, arg2) {
  let coll, val;
  if (arg2 === undefined) {
    // (reduce f coll)
    let iter = iterable(arg1)[Symbol.iterator]();
    val = iter.next().value;
    coll = iter;
  } else {
    // (reduce f val coll)
    val = arg1;
    coll = iterable(arg2);
  }
  if (val instanceof Reduced) {
    return val.value;
  }
  for (const x of coll) {
    val = f(val, x);
    if (val instanceof Reduced) {
      val = val.value;
      break;
    }
  }
  return val;
}

var tolr = false;
export function warn_on_lazy_reusage_BANG_() {
  tolr = true;
}

class LazyIterable {
  constructor(gen) {
    this.gen = gen;
    this.usages = 0;
  }
  [Symbol.iterator]() {
    this.usages++;
    if (this.usages >= 2 && tolr) {
      try {
        throw new Error();
      }
      catch (e) {
        console.warn('Re-use of lazy value', e.stack);
      }
    }
    return this.gen();
  }
}

LazyIterable.prototype[IIterable] = true; // Closure compatibility

export function lazy(f) {
  return new LazyIterable(f);
}


export class Cons {
  constructor(x, coll) {
    this.x = x;
    this.coll = coll;
  }
  *[Symbol.iterator]() {
    yield this.x;
    yield* iterable(this.coll);
  }
}

export function cons(x, coll) {
  return new Cons(x, coll);
  // return lazy(function* () {
  //   yield x;
  //   yield* iterable(coll);
  // });
}

export function map(f, ...colls) {
  // if (! (f instanceof Function)) {
  //   throw new Error(`Argument f must be a function but is ${typeof(f)}`);
  // }
  switch (colls.length) {
    case 0:
      throw new Error('map with 2 arguments is not supported yet');
    case 1:
      return lazy(function* () {
        for (const x of iterable(colls[0])) {
          yield f(x);
        }
      });
    default:
      return lazy(function* () {
        const iters = colls.map((coll) => es6_iterator(iterable(coll)));
        while (true) {
          let args = [];
          for (const i of iters) {
            const nextVal = i.next();
            if (nextVal.done) {
              return;
            }
            args.push(nextVal.value);
          }
          yield f(...args);
        }
      });
  }
}

export function filter(pred, coll) {
  return lazy(function* () {
    for (const x of iterable(coll)) {
      if (pred(x)) {
        yield x;
      }
    }
  });
}

export function filterv(pred, coll) {
  return [...filter(pred, coll)];
}

export function remove(pred, coll) {
  return filter(complement(pred), coll);
}

export function map_indexed(f, coll) {
  let ret = [];
  let i = 0;
  for (const x of iterable(coll)) {
    ret.push(f(i, x));
    i++;
  }
  return ret;
}

export function keep_indexed(f, coll) {
  let ret = [];
  let i = 0;
  for (const x of iterable(coll)) {
    let fret = f(i, x);
    if (!!fret) {
      ret.push(fret);
    }
    i++;
  }
  return ret;
}

export function str(...xs) {
  return xs.join('');
}

export function not(expr) {
  return !expr;
}

export function nil_QMARK_(v) {
  return v == null;
}

export const PROTOCOL_SENTINEL = {};

function pr_str_1(x) {
  return JSON.stringify(x, (_key, value) => {
    switch (typeConst(value)) {
      case SET_TYPE:
      case LAZY_ITERABLE_TYPE:
        return [...value];
      case MAP_TYPE:
        return Object.fromEntries(value);
      default:
        return value;
    }
  });
}

export function pr_str(...xs) {
  return xs.map(pr_str_1).join(' ');
}

export function prn(...xs) {
  println(pr_str(...xs));
}

export function Atom(init) {
  this.val = init;
  this._watches = {};
  this._deref = () => this.val;
  this._hasWatches = false;
  this._reset_BANG_ = (x) => {
    let old_val = this.val;
    this.val = x;
    if (this._hasWatches) {
      for (let entry of Object.entries(this._watches)) {
        let k = entry[0];
        let f = entry[1];
        f(k, this, old_val, x);
      }
    }
    return x;
  };
  this._add_watch = (k, fn) => {
    this._watches[k] = fn;
    this._hasWatches = true;
  };
  this._remove_watch = (k) => {
    delete this._watches[k];
  };
}

export function atom(init) {
  return new Atom(init);
}

export function deref(ref) {
  return ref._deref();
}

export function reset_BANG_(atm, v) {
  atm._reset_BANG_(v);
}

export function swap_BANG_(atm, f, ...args) {
  const v = f(deref(atm), ...args);
  reset_BANG_(atm, v);
  return v;
}

export function range(begin, end, step) {
  return lazy(function* () {
    let b = begin,
      e = end,
      s = step;
    if (end === undefined) {
      b = 0;
      e = begin;
    }
    let i = b || 0;
    s = step || 1;
    while (e === undefined || i < e) {
      yield i;
      i += s;
    }
  });
}

export function re_matches(re, s) {
  let matches = re.exec(s);
  if (matches && s === matches[0]) {
    if (matches.length === 1) {
      return matches[0];
    } else {
      return matches;
    }
  }
}

export function subvec(arr, start, end) {
  return arr.slice(start, end);
}

export function vector(...args) {
  return args;
}

export function vector_QMARK_(x) {
  return typeConst(x) === ARRAY_TYPE;
}

export function mapv(...args) {
  return [...map(...args)];
}

export function vec(x) {
  return [...iterable(x)];
}

export function set(coll) {
  return new Set(iterable(coll));
}

export function apply(f, ...args) {
  const xs = args.slice(0, args.length - 1);
  const coll = args[args.length - 1];
  return f(...xs, ...coll);
}

export function even_QMARK_(x) {
  return x % 2 == 0;
}

export function odd_QMARK_(x) {
  return !even_QMARK_(x);
}

export function complement(f) {
  return (...args) => not(f(...args));
}

export function constantly(x) {
  return (..._) => x;
}

class List extends Array {
  constructor(...args) {
    super();
    this.push(...args);
  }
}

export function list_QMARK_(x) {
  return typeConst(x) === LIST_TYPE;
}

export function list(...args) {
  return new List(...args);
}

export function array_QMARK_(x) {
  return x instanceof Array;
}

export function concat(...colls) {
  return lazy(function* () {
    for (const coll of colls) {
      yield* iterable(coll);
    }
  });
}

export function mapcat(f, ...colls) {
  return concat(...map(f, ...colls));
}

export function identity(x) {
  return x;
}

export function interleave(...colls) {
  return lazy(function* () {
    const iters = colls.map((coll) => es6_iterator(iterable(coll)));
    while (true) {
      let res = [];
      for (const i of iters) {
        const nextVal = i.next();
        if (nextVal.done) {
          return;
        }
        res.push(nextVal.value);
      }
      yield* res;
    }
  });
}

export function interpose(sep, coll) {
  return drop(1, interleave(repeat(sep), coll));
}

export function select_keys(o, ks) {
  const type = typeConst(o);
  // ret could be object or array, but in the future, maybe we'll have an IEmpty protocol
  const ret = emptyOfType(type);
  for (const k of ks) {
    const v = get(o, k);
    if (v != undefined) {
      assoc_BANG_(ret, k, v);
    }
  }
  return ret;
}

export function partition_all(n, ...args) {
  let step = n,
    coll = args[0];

  if (args.length === 2) {
    [step, coll] = args;
  }
  return partitionInternal(n, step, [], coll, true);
}

export function partition(n, ...args) {
  let step = n,
    pad = [],
    coll = args[0];

  if (args.length === 2) {
    [step, coll] = args;
  } else if (args.length > 2) {
    [step, pad, coll] = args;
  }
  return partitionInternal(n, step, pad, coll, false);
}

function partitionInternal(n, step, pad, coll, all) {
  return lazy(function* () {
    let p = [];
    let i = 0;
    for (let x of iterable(coll)) {
      if (i < n) {
        p.push(x);
        if (p.length === n) {
          yield p;
          p = step < n ? p.slice(step) : [];
        }
      }
      i++;
      if (i === step) {
        i = 0;
      }
    }

    if (p.length > 0) {
      if (p.length === n || all) {
        yield p;
      } else if (pad.length) {
        p.push(...pad.slice(0, n - p.length));
        yield p;
      }
    }
  });
}

export function empty(coll) {
  const type = typeConst(coll);
  if (type != null) {
    return emptyOfType(type);
  } else {
    throw new Error(`Can't create empty of ${typeof coll}`);
  }
}

export function merge(...args) {
  // if the first arg is nil we coerce it into a map.
  const firstArg = args[0];
  let obj;
  if (firstArg === null || firstArg === undefined) {
    obj = {};
  } else {
    obj = into(empty(firstArg), firstArg);
  }
  return conj_BANG_(obj, ...args.slice(1));
}

export function key(entry) {
  return entry[0];
}

export function val(entry) {
  return entry[1];
}

export function merge_with(f, ...maps) {
  var hasMap = false;
  for (const m of maps) {
    if (m != null) {
      hasMap = true;
      break;
    }
  }
  if (hasMap) {
    let mergeEntry = (m, e) => {
      let k = key(e);
      let v = val(e);
      if (contains_QMARK_(m, k)) {
        return assoc(m, k, f(get(m, k), v));
      } else {
        return assoc(m, k, v);
      }
    };
    let merge2 = (m1, m2) => {
      return reduce(mergeEntry, m1 || {}, seq(m2));
    };
    return reduce(merge2, maps);
  } else {
    return null;
  }
}

export function system_time() {
  return performance.now();
}

export function into(...args) {
  switch (args.length) {
    case 0:
      return [];
    case 1:
      return args[0];
    default:
      return conj(args[0] ?? [], ...iterable(args[1]));
  }
}

export function identical_QMARK_(x, y) {
  return x === y;
}

export function repeat(...args) {
  if (args.length == 0 || args.length > 2) {
    throw new Error(`Invalid arity: ${args.length}`);
  }

  return {
    [IIterable]: true,
    [IIterable__iterator]:
      args.length == 1
        ? function* () {
            let x = args[0];
            while (true) yield x;
          }
        : function* () {
            let [n, x] = args;
            for (var i = 0; i < n; i++) yield x;
          },
  };
}

export function take(n, coll) {
  return lazy(function* () {
    let i = n - 1;
    for (const x of iterable(coll)) {
      if (i-- >= 0) {
        yield x;
      }
      if (i < 0) {
        return;
      }
    }
  });
}

export function take_while(pred, coll) {
  return lazy(function* () {
    for (const o of iterable(coll)) {
      if (pred(o)) yield o;
      else return;
    }
  });
}

export function take_nth(n, coll) {
  if (n <= 0) {
    return repeat(first(coll));
  }

  return lazy(function* () {
    let i = 0;
    for (let x of iterable(coll)) {
      if (i % n === 0) {
        yield x;
      }
      i++;
    }
  });
}

export function partial(f, ...xs) {
  return function (...args) {
    return f(...xs, ...args);
  };
}

export function cycle(coll) {
  return lazy(function* () {
    while (true) yield* coll;
  });
}

export function drop(n, xs) {
  return lazy(function* () {
    let iter = _iterator(iterable(xs));
    for (let x = 0; x < n; x++) {
      iter.next();
    }
    yield* iter;
  });
}

export function drop_while(pred, xs) {
  return lazy(function* () {
    let iter = _iterator(iterable(xs));
    while (true) {
      let nextItem = iter.next();
      if (nextItem.done) {
        break;
      }
      let value = nextItem.value;
      if (!pred(value)) {
        yield value;
        break;
      }
    }
    yield* iter;
  });
}

export function distinct(coll) {
  return lazy(function* () {
    let seen = new Set();
    for (const x of iterable(coll)) {
      if (!seen.has(x)) yield x;
      seen.add(x);
    }
    return;
  });
}

export function update(coll, k, f, ...args) {
  return assoc(coll, k, f(get(coll, k), ...args));
}

export function get_in(coll, path, orElse) {
  let entry = coll;
  for (const item of path) {
    entry = get(entry, item);
  }
  if (entry === undefined) return orElse;
  return entry;
}

export function update_in(coll, path, f, ...args) {
  return assoc_in(coll, path, f(get_in(coll, path), ...args));
}

export function fnil(f, x, ...xs) {
  return function (a, ...args) {
    if (!a) {
      return f(x, ...xs, ...args);
    } else {
      return f(a, ...xs, ...args);
    }
  };
}

export function every_QMARK_(pred, coll) {
  for (let x of iterable(coll)) {
    if (!pred(x)) return false;
  }
  return true;
}

export function not_every_QMARK_(pred, coll) {
  return !every_QMARK_(pred, coll);
}

export function keep(pred, coll) {
  return lazy(function* () {
    for (const o of iterable(coll)) {
      const res = pred(o);
      if (res) yield res;
    }
  });
}

export function reverse(coll) {
  if (coll instanceof Array) {
    // performance: we don't need to copy to another array first
    return coll.reverse();
  } else return [...coll].reverse();
}

export function sort(f, coll) {
  if (coll === undefined) {
    coll = f;
    f = undefined;
  }
  return [...coll].sort(f);
}

export function shuffle(coll) {
  return [...coll].sort(function (a, b) {
    return Math.random() - 0.5;
  });
}

export function some(pred, coll) {
  for (const o of iterable(coll)) {
    const res = pred(o);
    if (res) return res;
  }
}

export function not_any_QMARK_(pred, coll) {
  return !some(pred, coll);
}

export function replace(smap, coll) {
  let mapf = coll instanceof Array ? mapv : map;
  return mapf((x) => {
    const repl = smap[x];
    if (repl !== undefined) {
      return repl;
    } else {
      return x;
    }
  }, coll);
}

export function empty_QMARK_(coll) {
  return seq(coll) ? false : true;
}

export function rand_int(n) {
  return Math.floor(Math.random() * n);
}

export function rand_nth(coll) {
  let ri = rand_int(count(coll));
  return nth(coll, ri);
}

function _repeatedly(f) {
  return lazy(function* () {
    while (true) yield f();
  });
}

export function repeatedly(n, f) {
  if (f === undefined) {
    f = n;
    n = undefined;
  }
  const res = _repeatedly(f);
  if (n) {
    return take(n, res);
  } else {
    return res;
  }
}

export function update_BANG_(m, k, f, ...args) {
  const v = get(m, k);
  return assoc_BANG_(m, k, f(v, ...args));
}

export function group_by(f, coll) {
  const res = {};
  for (const o of iterable(coll)) {
    const key = f(o);
    update_BANG_(res, key, fnil(conj_BANG_, []), o);
  }
  return res;
}

export function frequencies(coll) {
  const res = {};
  const uf = fnil(inc, 0);
  for (const o of iterable(coll)) {
    update_BANG_(res, o, uf);
  }
  return res;
}

export class LazySeq {
  constructor(f) {
    this.f = f;
    this.res = undefined;
  }
  *[Symbol.iterator]() {
    if (this.res === undefined) {
      this.res = this.f();
      this.f = null;
    }
    yield* iterable(this.res);
  }
}

export function butlast(coll) {
  let x = [...iterable(coll)];
  x.pop();
  return x.length > 0 ? x : null;
}

export function drop_last(...args) {
  let [n, coll] = args.length > 1 ? args : [1, args[0]];
  return map((x, _) => x, coll, drop(n, coll));
}

export function split_at(n, coll) {
  return [take(n, coll), drop(n, coll)];
}

export function split_with(pred, coll) {
  return [take_while(pred, coll), drop_while(pred, coll)];
}

export function count(coll) {
  if (!coll) return 0;
  const len = coll.length || coll.size;
  if (typeof len === 'number') {
    return len;
  }
  let ret = 0;
  for (const o of iterable(coll)) {
    ret++;
  }
  return ret;
}

export function true_QMARK_(x) {
  return x === true;
}

export function false_QMARK_(x) {
  return x === false;
}

export function some_QMARK_(x) {
  return !(x === null || x === undefined);
}

export function boolean$(x) {
  return !!x;
}

export function zero_QMARK_(x) {
  return x === 0;
}

export function neg_QMARK_(x) {
  return x < 0;
}

export function pos_QMARK_(x) {
  return x > 0;
}

export function js_obj(...args) {
  var ctr = 0;
  let ret = {};
  while (true) {
    if (ctr >= args.length) {
      break;
    }
    ret[args[ctr]] = args[ctr + 1];
    ctr = ctr + 2;
  }
  return ret;
}

export function alength(arr) {
  return arr.length;
}

export function aset(arr, idx, val) {
  arr[idx] = val;
  return val;
}

export function dorun(x) {
  for (const o of iterable(x)) {
    // nothing here, just consume for side effects
  }
  return null;
}

export function doall(x) {
  // realize as concrete array
  return vec(x);
}

export function aclone(arr) {
  let cloned = [...arr];
  return cloned;
}

export function add_watch(ref, key, fn) {
  return ref._add_watch(key, fn);
}

export function remove_watch(ref, key) {
  return ref._remove_watch(key);
}

export function reduce_kv(f, init, m) {
  if (!m) {
    return init;
  }
  var ret = init;
  for (let o of Object.entries(m)) {
    ret = f(ret, o[0], o[1]);
  }
  return ret;
}

export function max(x, y, ...more) {
  if (y == undefined) {
    return x;
  }
  let m = x > y ? x : y;
  if (more.length == 0) {
    return m;
  }
  return more.reduce((x, y) => {
    return x > y ? x : y;
  }, m);
}

export function min(x, y, ...more) {
  if (y == undefined) {
    return x;
  }
  let m = x < y ? x : y;
  if (more.length == 0) {
    return m;
  }
  return more.reduce((x, y) => {
    return x < y ? x : y;
  }, m);
}

export function map_QMARK_(x) {
  return x instanceof Object;
}

export function every_pred(...preds) {
  return (...args) => {
    for (let p of preds) {
      for (let a of args) {
        let res = p(a);
        if (!res) {
          return false;
        }
      }
    }
    return true;
  };
}

export function some_fn(...fns) {
  return (...args) => {
    for (let f of fns) {
      for (let a of args) {
        let res = f(a);
        if (!!res) {
          return res;
        }
      }
    }
    return undefined;
  };
}

export function into_array(type, aseq) {
  let theSeq = aseq || type;
  return vec(theSeq);
}

export function iterate(f, x) {
  var current = x;
  return lazy(function* () {
    while (true) {
      yield current;
      current = f(current);
    }
  });
}

export function juxt(...fs) {
  return (...args) => {
    let ret = [];
    for (let f of fs) {
      ret.push(f(...args));
    }
    return ret;
  };
}

export function next(x) {
  if (x instanceof Array) {
    let ret = x.slice(1);
    if (ret.length > 0) {
      return ret;
    } else {
      return null;
    }
  } else {
    // opiniated choice, next realizes underlying sequence
    return next(vec(x));
  }
}

export function compare(x, y) {
  if (x === y) {
    return 0;
  } else {
    if (x == null) {
      return -1;
    }
    if (y == null) {
      return 1;
    }
    if (typeof x === 'number') {
      if (typeof y === 'number') {
        if (x === y) {
          return 0;
        }
        if (x < y) {
          return -1;
        }
        return 1;
      } else {
        throw new Error('comparing number to other type');
      }
    } else {
      throw new Error('comparing number to other type');
    }
  }
}

export function to_array(aseq) {
  return into_array(aseq);
}

// export function truth_(x) {
//   return ( x != null && x !== false );
// }

export function subs(s, start, end) {
  return s.substring(start, end);
}

export function fn_QMARK_(x) {
  return 'function' === typeof x;
}

export function* re_seq(re, s) {
  let matches = re.exec(s);
  if (matches) {
    let match_str = matches[0];
    let match_vals = matches.length === 1 ? match_str : vec(matches);
    yield* cons(
      match_vals,
      lazy(function* () {
        let post_idx = matches.index + max(1, match_str.length);
        if (post_idx <= s.length) {
          yield* re_seq(re, subs(s, post_idx));
        }
      })
    );
  }
}

export function NaN_QMARK_(x) {
  return Number.isNaN(x);
}

export function number_QMARK_(x) {
  return typeof x == 'number';
}

export function keys(obj) {
  if (obj) {
    return Object.keys(obj);
  } else {
    return null;
  }
}

export function js_keys(obj) {
  return keys(obj);
}

export function vals(obj) {
  if (obj) {
    return Object.values(obj);
  } else {
    return null;
  }
}

export function string_QMARK_(s) {
  return typeof s === 'string';
}

export function coll_QMARK_(coll) {
  return typeConst(coll) != undefined;
}

export function regexp_QMARK_(coll) {
  return coll instanceof RegExp;
}

class ExceptionInfo extends Error {
  constructor(message, data, cause) {
    super(message);
    this._data = data;
    this._cause = cause;
  }
}

export function ex_data(e) {
  if (e instanceof ExceptionInfo) return e._data;
  else return null;
}

export function ex_message(e) {
  if (e instanceof Error) return e.message;
  else return null;
}

export function ex_cause(e) {
  if (e instanceof ExceptionInfo) return e._cause;
  else return null;
}

export function ex_info(message, data, cause) {
  return new ExceptionInfo(message, data, cause);
}

export function int_QMARK_(x) {
  return Number.isInteger(x);
}

export const integer_QMARK_ = int_QMARK_;

const _metaSym = Symbol('meta');

export function meta(x) {
  if (x instanceof Object) {
    return x[_metaSym];
  } else return null;
}

export function with_meta(x, m) {
  let ret = copy(x);
  ret[_metaSym] = m;
  return ret;
}

export function boolean_QMARK_(x) {
  return x === true || x === false;
}

export function counted_QMARK_(x) {
  let tc = typeConst(x);
  switch (tc) {
    case (ARRAY_TYPE, MAP_TYPE, OBJECT_TYPE, LIST_TYPE, SET_TYPE):
      return true;
  }
  return false;
}

export function bounded_count(n, coll) {
  if (counted_QMARK_(coll)) {
    return count(coll);
  } else {
    return count(take(n, coll));
  }
}

export function find(m, k) {
  let v = get(m, k);
  if (v !== undefined) {
    return [k, v];
  }
}

export function mod(x, y) {
  return (x % y + y) % y;
}
