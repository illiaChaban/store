"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var fp_1 = require("lodash/fp");
var Store = /** @class */ (function () {
    function Store(initialData) {
        if (initialData === void 0) { initialData = {}; }
        this.data$ = new rxjs_1.BehaviorSubject(initialData);
    }
    Store.prototype.get = function (path) {
        if (path === void 0) { path = []; }
        return this.data$.pipe(operators_1.map(function (data) { return safeGet(data, path); }), operators_1.distinctUntilChanged());
    };
    Store.prototype.set = function (path, value) {
        this.update(function (data) { return safeSet(data, path, value); });
    };
    Store.prototype.unset = function (path) {
        this.update(function (data) { return fp_1.unset(path, data); });
    };
    Store.prototype.transform = function (path, transformer) {
        this.update(function (data) {
            var oldValue = safeGet(data, path);
            var newValue = transformer(oldValue);
            return safeSet(data, path, newValue);
        });
    };
    Store.prototype.extend = function (path, partial) {
        this.transform(path, function (data) { return (__assign(__assign({}, data), partial)); });
    };
    Store.prototype.batchSet = function (batch) {
        this.update(function (data) {
            return batch.reduce(function (data, _a) {
                var path = _a.path, value = _a.value;
                return safeSet(data, path, value);
            }, data);
        });
    };
    Store.prototype.update = function (updater) {
        var oldData = this.data$.value;
        var newData = updater(oldData);
        if (newData !== oldData)
            this.data$.next(newData);
    };
    return Store;
}());
function safeGet(obj, path) {
    return path.length ? fp_1.get(path, obj) : obj;
}
function safeSet(obj, path, value) {
    return path.length ? fp_1.setWith(Object, path, value, obj) : value;
}
;
var initialData = {
    e: {
        f: "world"
    }
};
var myStore = new Store(initialData);
var log = function (msg) { return function (value) { return console.log(msg, value); }; };
myStore.get().subscribe(log('store: ')); // logs store: initialData
myStore.get(['b', 'd']).subscribe(log('b -> d: ')); // logs b -> d; undefined
myStore.get(['e']).subscribe(log('e: ')); // logs e: { f: "world" }
myStore.set(['b', 'c'], false);
// logs:
// store: {...initialData, { b: { c: false }}}
myStore.set(['b', 'd'], "hello");
// // logs:
// // store: {...initialData, { b: { c: false, d: "hello" }}}
// // b -> d: "hello"
myStore.extend(['b'], { d: 'cool', f: 'store' });
// // logs:
// store: {...initialData, { b: { c: false, d: "cool", f: "store" }}}
// b -> d: "cool"
// console.log(safeSet(initialData, ['b', 'c'], "hello world"))
