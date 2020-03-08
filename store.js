"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const fp_1 = require("lodash/fp");
class Store {
    constructor(initialData = {}) {
        this.data$ = new rxjs_1.BehaviorSubject(initialData);
    }
    get(path = []) {
        return this.data$.pipe(operators_1.map((data) => safeGet(data, path)), operators_1.distinctUntilChanged());
    }
    set(path, value) {
        this.update((data) => safeSet(data, path, value));
    }
    unset(...pathes) {
        this.update((data) => pathes.reduce((newData, path) => fp_1.unset(path, newData), data));
    }
    transform(path, transformer) {
        this.update((data) => {
            const oldValue = safeGet(data, path);
            const newValue = transformer(oldValue);
            return safeSet(data, path, newValue);
        });
    }
    extend(path, partial) {
        this.transform(path, (data) => ({ ...data, ...partial }));
    }
    batchSet(batch) {
        this.update((data) => {
            return batch.reduce((data, { path, value }) => {
                return safeSet(data, path, value);
            }, data);
        });
    }
    update(updater) {
        const oldData = this.data$.value;
        const newData = updater(oldData);
        if (newData !== oldData)
            this.data$.next(newData);
    }
}
function safeGet(obj, path) {
    return path.length ? fp_1.get(path, obj) : obj;
}
function safeSet(obj, path, value) {
    return path.length ? fp_1.setWith(Object, path, value, obj) : value;
}
;
const initialData = {
    e: {
        f: "world"
    }
};
const myStore = new Store(initialData);
const log = (msg) => (value) => console.log(msg, value);
myStore.get().subscribe(log('store: '));
myStore.get(['b', 'd']).subscribe(log('b -> d: '));
myStore.get(['e']).subscribe(log('e: '));
// logs 
// store:  { e: { f: 'world' } }
// b -> d:  undefined
// e:  { f: 'world' }
myStore.set(['b', 'c'], false);
// logs:
// store:  { e: { f: 'world' }, b: { c: false } }
myStore.set(['b', 'd'], "hello");
// logs:
// store:  { e: { f: 'world' }, b: { c: false, d: 'hello' } }
// b -> d:  hello
myStore.extend(['b'], { d: 'cool', f: 'store' });
// logs:
// store:  { e: { f: 'world' }, b: { c: false, d: 'cool', f: 'store' } }
// b -> d:  cool
myStore.unset(['b', 'c'], ['e', 'f']);
// logs:
// store:  { e: {}, b: { d: 'cool', f: 'store' } }
// e:  {}
