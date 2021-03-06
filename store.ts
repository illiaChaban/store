import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { get, setWith, unset } from 'lodash/fp';


type Key = string | number | symbol;
type Path = Key[];
interface IBatchSet {
	path: Path,
	value: any,
}

class Store<T extends object = any> {

	private data$: BehaviorSubject<T>;

	constructor(initialData: Partial<T> = {}) {
		this.data$ = new BehaviorSubject(initialData as T);
	}

	get<T>(path: Path = []): Observable<T> {
		return this.data$.pipe(
			map((data) => safeGet(data, path)),
			distinctUntilChanged(),
		);
	}

	set(path: Path, value: any): void {
		this.update((data) => safeSet(data, path, value));
	}

	unset(...pathes: Path[]): void {
		this.update((data) => 
			pathes.reduce((newData, path) => unset(path, newData), data));
	}

	transform(path: Path, transformer: (data: any) => any): void {
		this.update((data) => {
			const oldValue = safeGet(data, path);
			const newValue = transformer(oldValue);
			return safeSet(data, path, newValue);
		});
	}

	extend<T>(path: Path, partial: Partial<T>): void {
		this.transform(path, (data: T) => ({...data, ...partial}));
	}

	batchSet(batch: IBatchSet[]): void {
		this.update((data) => {
			return batch.reduce((data, {path, value}) => {
				return safeSet(data, path, value);
			}, data);
		});
	}

	private update( transformer: (oldData: T) => T ): void {
		const oldData = this.data$.value;
		const newData = transformer(oldData);
		this.data$.next(newData);
	}
}

function safeGet<T extends object>(obj: T, path: Path): any {
	return path.length ? get(path, obj) : obj;
}

function safeSet<T extends object>(obj: T, path: Path, value: any): T {
	return path.length ? setWith(Object, path, value, obj) : value;
}


// TEST
// ****************************************

interface ITest {
	a: number,
	b: {
		c: boolean,
		d: string
	},
	e: {
		f: string
	}
};

const initialData = {
	e: {
		f: "world"
	}
};

const myStore = new Store<ITest>(initialData);
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