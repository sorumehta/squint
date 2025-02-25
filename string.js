import { iterable, string_QMARK_ } from './core.js';

export function blank_QMARK_(s) {
  if (!s) return true;
  if (s.length === 0) return true;
  if (s.trimLeft().length === 0) return true;
  return false;
}

export function join(sep, coll) {
  if (coll === undefined) {
    coll = sep;
    sep = '';
  }
  if (coll instanceof Array) {
    return coll.join(sep);
  }
  let ret = '';
  let addSep = false;
  for (const o of iterable(coll)) {
    if (addSep) ret += sep;
    ret += o;
    addSep = true;
  }
  return ret;
}

export function trim(s) {
  return s.trim();
}

export function triml(s) {
  return s.trimLeft();
}

export function trimr(s) {
  return s.trimRight();
}

export function split(s, re) {
  return s.split(re);
}

export function starts_with_QMARK_(s, substr) {
  return s.startsWith(substr);
}

const escapeRegex = function(s) {
  return s.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
};

const replaceAll = function(s, re, replacement) {
  var flags = "g";
  if (re.ignoreCase) {
    flags += "i";
  }
  if (re.multiline) {
    flags += "m";
  }
  if (re.unicode) {
    flags += "u";
  }
  let r = new RegExp(re.source, flags);
  return s.replace(r, replacement);
};

const replaceWith = function(f) {
  return (...args) => {
    let [matches, _,  __] = args;
    if (matches.length == 1) {
      return f(matches[0]);
    } else {
      return f(matches);
    }
  };
};

export function replace(s, match, replacement) {
  if (string_QMARK_(match)) {
    return s.replace(new RegExp(escapeRegex(match), "g"), replacement);
  }
  if (match instanceof RegExp) {
    if (string_QMARK_(replacement)) {
      return replaceAll(s, match, replacement);
    }
    else {
      return replaceAll(s, match, replaceWith(replacement));
    }
  }
  throw `Invalid match arg: $match`;
};
