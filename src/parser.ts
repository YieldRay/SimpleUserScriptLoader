interface Susl {
    body: string;
    meta: string;
    name: string;
    version: string;
    author: string;
    icon: string;
    description: string;
    homepage: string;
    require: string[];
    resource: string[];
}

class autoMap extends Map {
    constructor() {
        super();
    }
    set(key: any, value: any): this {
        if (this.has(key)) {
            const prev = this.get(key);
            if (Array.isArray(prev)) {
                prev.push(value);
                super.set(key, prev);
            } else {
                super.set(key, [prev, value]);
            }
        } else {
            super.set(key, value);
        }
        return this;
    }
    toObject() {
        const obj: any = [...this.entries()].reduce(
            (obj, [key, value]) => (((obj as any)[key] = value), obj),
            {}
        );
        if (typeof obj.resource === "string") {
            obj.resource = [obj.resource];
        }
        if (Array.isArray(obj.resource)) {
            const res: any = {};
            obj.resource.forEach((str: string) => {
                const [k, v] = str.split(/ +/);
                if (k && v) {
                    res[k] = v;
                }
            });
            obj.resource = res;
        } else {
            obj.resource = {};
        }
        return obj;
    }
}

function parseMeta(meta: string): any {
    const lines = meta.split(/\r\n|\r|\n/);
    const metaMap = new autoMap();
    for (const line of lines) {
        const [, key, value] = line.match(/^\/\/(?:\s+)@(\S+)\s+(.+)/);
        if (key && value) {
            metaMap.set(key, value);
        }
    }
    return metaMap.toObject();
}

function devider(sourceCode: string): { meta: string; body: string } {
    const l = String.raw`// ==UserScript==`,
        r = String.raw`// ==/UserScript==`;
    const start = sourceCode.indexOf(l);
    const end = sourceCode.indexOf(r);
    const meta = sourceCode.substring(start + l.length, end).trim();
    const body = sourceCode.substring(end + r.length).trim();
    return { meta, body };
}

function parseAll(code: string): Susl {
    const { meta, body } = devider(code);
    const metaObj = parseMeta(meta);
    const resp: Susl = {
        body,
        meta,
        name: metaObj.name,
        version: metaObj.version || "none",
        author: metaObj.author || "",
        icon: metaObj.icon || "",
        description: metaObj.description || "",
        homepage: metaObj.homepage || "",
        require: metaObj.require?.replaceAll(" ", " ").split(" ") || [],
        resource: metaObj.resource || [],
    };
    return resp;
}

export { parseMeta, parseAll, Susl };
