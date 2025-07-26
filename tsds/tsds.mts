import create_ds from "./ds.mjs";
import type * as dst from "./ds.d.mts";

const ds: dst.EmbindModule = await create_ds();

let _buffer_size: number = 1024;

export function buffer_size(size: number = 0): number {
    const old_size = _buffer_size;
    if (size !== 0) {
        _buffer_size = size;
    }
    return old_size;
}

interface Common {
    clone(): Common;
    data_size(): number;
}

interface StaticCommon<T extends Common> {
    from_binary(buffer: dst.Buffer): T;
    to_binary(value: T): dst.Buffer;
    from_string(text: string, size: number): T;
    to_string(value: T, size: number): string;
}

type InitialArgument<T extends Common> = _common_t<T> | T | string | dst.Buffer | null;

class _common_t<T extends Common> {
    type: StaticCommon<T>;
    value: T;
    capacity: number;

    constructor(type: StaticCommon<T>, value: InitialArgument<T>, size: number = 0) {
        this.type = type;
        if (value instanceof _common_t) {
            this.value = value.value;
            this.capacity = value.capacity;
            if (size !== 0) {
                throw new Error("Cannot set capacity when copying from another instance.");
            }
        } else if (value instanceof (this.type as unknown as new () => T)) {
            this.value = value;
            this.capacity = size;
        } else if (typeof value === "string") {
            this.capacity = size !== 0 ? size : buffer_size();
            this.value = this.type.from_string(value, this.capacity);
            if (this.value === null) {
                throw new Error("Initialization from a string failed.");
            }
        } else if (value instanceof ds.Buffer) {
            this.value = this.type.from_binary(value);
            this.capacity = this.size();
            if (size !== 0) {
                throw new Error("Cannot set capacity when initializing from bytes.");
            }
        } else {
            throw new Error("Unsupported type for initialization.");
        }
    }

    toString(): string {
        const result = this.type.to_string(this.value, buffer_size());
        if (result === "") {
            throw new Error("Conversion to string failed.");
        }
        return result;
    }

    data(): dst.Buffer {
        return this.type.to_binary(this.value);
    }

    size(): number {
        return this.value.data_size();
    }

    copy(): this {
        const this_constructor = this.constructor as new (value: T, size: number) => this;
        return new this_constructor(this.value.clone() as T, this.size());
    }

    key(): string {
        return this.toString();
    }
}

export class string_t extends _common_t<dst.String> {
    constructor(value: InitialArgument<dst.String>, size: number = 0) {
        super(ds.String, value, size);
    }
}

export class variable_t extends _common_t<dst.Variable> {
    constructor(value: InitialArgument<dst.Variable>, size: number = 0) {
        super(ds.Variable, value, size);
    }

    name(): string_t {
        return new string_t(this.value.name());
    }
}

export class item_t extends _common_t<dst.Item> {
    constructor(value: InitialArgument<dst.Item>, size: number = 0) {
        super(ds.Item, value, size);
    }

    name(): string_t {
        return new string_t(this.value.name());
    }
}

export class list_t extends _common_t<dst.List> {
    constructor(value: InitialArgument<dst.List>, size: number = 0) {
        super(ds.List, value, size);
    }

    length(): number {
        return this.value.length();
    }

    getitem(index: number): term_t {
        return new term_t(this.value.getitem(index));
    }
}

export class term_t extends _common_t<dst.Term> {
    constructor(value: InitialArgument<dst.Term>, size: number = 0) {
        super(ds.Term, value, size);
    }

    term(): variable_t | item_t | list_t {
        const term_type: dst.TermType = this.value.get_type();
        if (term_type === ds.TermType.Variable) {
            return new variable_t(this.value.variable());
        } else if (term_type === ds.TermType.Item) {
            return new item_t(this.value.item());
        } else if (term_type === ds.TermType.List) {
            return new list_t(this.value.list());
        } else {
            throw new Error("Unexpected term type.");
        }
    }

    ground(other: term_t, scope: string = ""): term_t | null {
        const capacity = buffer_size();
        const term = ds.Term.ground(this.value, other.value, scope, capacity);
        if (term === null) {
            return null;
        }
        return new term_t(term, capacity);
    }
}

export class rule_t extends _common_t<dst.Rule> {
    constructor(value: InitialArgument<dst.Rule>, size: number = 0) {
        super(ds.Rule, value, size);
    }

    length(): number {
        return this.value.length();
    }

    getitem(index: number): term_t {
        return new term_t(this.value.getitem(index));
    }

    conclusion(): term_t {
        return new term_t(this.value.conclusion());
    }

    ground(other: rule_t, scope: string = ""): rule_t | null {
        const capacity = buffer_size();
        const rule = ds.Rule.ground(this.value, other.value, scope, capacity);
        if (rule === null) {
            return null;
        }
        return new rule_t(rule, capacity);
    }

    match(other: rule_t): rule_t | null {
        const capacity = buffer_size();
        const rule = ds.Rule.match(this.value, other.value, capacity);
        if (rule === null) {
            return null;
        }
        return new rule_t(rule, capacity);
    }
}

export class search_t {
    _search: dst.Search;

    constructor(limit_size: number = 1000, buffer_size: number = 1024) {
        this._search = new ds.Search(limit_size, buffer_size);
    }

    set_limit_size(limit_size: number): void {
        this._search.set_limit_size(limit_size);
    }

    set_buffer_size(buffer_size: number): void {
        this._search.set_buffer_size(buffer_size);
    }

    reset(): void {
        this._search.reset();
    }

    add(text: string, sep: string | null = null): number {
        if (sep !== null) {
            return this._search.add_multiple(text, sep);
        } else {
            return Number(this._search.add_single(text));
        }
    }

    execute(callback: (candidate: rule_t) => boolean): number {
        return this._search.execute((candidate: dst.Rule): boolean => {
            return callback(new rule_t(candidate.clone()));
        });
    }
}
