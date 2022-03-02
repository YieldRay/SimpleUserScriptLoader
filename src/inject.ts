import { parseAll, Susl } from "./parser.js";
const __version = "0.0.1";

// @ts-ignore
function suslLog(...notice) {
    console.info(`SimpleUserScriptLoader-${__version}: `, ...notice);
}

// main function
async function injectGM(sourceCode: string) {
    const _susl = parseAll(sourceCode);
    const resourceTexts: any = Object.create(null);
    for (const key in _susl.resource) {
        const fe = await fetch(_susl.resource[key]);
        resourceTexts[key] = await fe.text();
    }
    for (const url of _susl.require) {
        const script = document.createElement("script");
        script.src = url;
        const waitLoad = new Promise((resolve, reject) => {
            script.onload = () => resolve(true);
            script.onerror = () => reject(false);
        });
        document.head.appendChild(script);
        await waitLoad;
    }
    suslLog("Loaded resourceTexts", resourceTexts);
    // inject GM apis to window
    Object.assign(window, {
        GM_info: GM_info(_susl),
        GM_getValue,
        GM_setValue,
        GM_deleteValue,
        GM_listValues,
        GM_addValueChangeListener,
        GM_removeValueChangeListener,
        GM_getResourceText(name: string) {
            return resourceTexts[name] || "";
        },
        GM_registerMenuCommand,
        GM_unregisterMenuCommand,
        GM_openInTab,
        GM_getResourceURL(name: string, isBlobUrl?: boolean): string {
            suslLog("GM_getResourceURL is not fully implemented yet.");
            if (!isBlobUrl) {
                return "data:";
            }
            const blob = new Blob(resourceTexts[name], { type: "text/plain" });
            return URL.createObjectURL(blob);
        },
        GM_addElement,
        GM_addStyle,
        GM_notification() {
            suslLog("GM_notification is not fully implemented yet.");
        },
        GM_setClipboard() {
            suslLog("GM_setClipboard is not fully implemented yet.");
        },
        GM_xmlhttpRequest,
        GM_download,
    });
    // run code
    return eval(sourceCode);
}

function GM_info(_susl: Susl): __gm_info {
    suslLog("GM_info is not fully implemented yet. Information is fake.");
    const info = {
        injectInto: "page",
        uuid: "88888888-4444-4444-4444-121212121212",
        scriptMetaStr: "\n" + _susl.meta,
        scriptHandler: "SimpleUserScriptLoader",
        version: __version,
        scriptWillUpdate: false,
        platform: {
            os: navigator.platform,
            browserName: "Chrome",
            browserVersion: "100.0.0.0",
            arch: "x86-64",
        },
        script: {
            description: _susl.description,
            excludes: [""],
            includes: [""],
            matches: [""],
            name: _susl.name,
            namespace: "susl",
            resources: [{ name: "", url: "" }],
            runAt: "",
            version: _susl.version,
        },
    };
    info.script.resources = Object.entries(_susl.resource).map(
        ([key, value]) => ({
            name: key,
            url: value,
        })
    );
    return info;
}

interface __gm_info {
    uuid: string;
    scriptMetaStr: string;
    scriptHandler: string;
    scriptWillUpdate: boolean;
    version: string;
    platform: {
        os: string;
        browserName: string;
        browserVersion: string;
        arch: string;
    };
    script: {
        description: string;
        excludes: string[];
        includes: string[];
        matches: string[];
        name: string;
        namespace: string;
        resources: { name: string; url: string }[];
        runAt: string;
        version: string;
    };
}

interface __storage {
    [key: string]: {
        value: any;
        listeners: {
            id: number;
            callback: (
                name: string,
                oldValue: any,
                newValue: any,
                remote: boolean
            ) => void;
        }[];
    };
}

/**
 * SimpleUserScriptLoader
 * Emulated Menu
 */
const suslMenu = {
    __wrapper: document.createElement("div"),
    __menu: document.createElement("div"),
    __showOrHide: document.createElement("span"),
    open() {
        this.__wrapper.style.display = "block";
    },
    close() {
        this.__wrapper.style.display = "none";
    },
    toggle() {
        if (this.__wrapper.style.display === "none") {
            this.__wrapper.style.display = "block";
        } else {
            this.__wrapper.style.display = "none";
        }
    },
};

(function (__wrapper, __menu, __showOrHide) {
    __showOrHide.onclick = () => {
        if (__menu.getAttribute("style")) {
            // show
            __menu.setAttribute("style", "");
            __showOrHide.innerHTML = `<span>hide[-]</span><br>`;
        } else {
            // hide
            __menu.setAttribute("style", "display: none");
            __showOrHide.innerHTML = `<span>show[+]</span><br>`;
        }
    };

    __wrapper.innerHTML = `<small>SimpleUserScriptLoader</small>&nbsp;`;
    __showOrHide.innerHTML = `<span>hide[-]</span><br>`;
    __showOrHide.style.cursor = "pointer";
    __showOrHide.style.userSelect = "none";
    __wrapper.appendChild(__showOrHide);
    __wrapper.style.cssText = `display:inline-block;position:fixed;top:4px;right:4px;padding:4px;border-radius:4px;font-family:Verdana, Arial, Helvetica, sans-serif`;
    __wrapper.style.zIndex = "99";
    __wrapper.style.backgroundColor = "rgba(222,222,222,0.35)";
    __wrapper.appendChild(__menu);
    document.body.appendChild(__wrapper);
})(suslMenu.__wrapper, suslMenu.__menu, suslMenu.__showOrHide);

// end menu, begin storage (not stable)
let __listenerId = 0;
const __storage: __storage = Object.create(null);

function runListeners(key: string, value: any) {
    for (const listener of __storage[key].listeners) {
        listener.callback(key, __storage[key].value, value, false);
        // remote is alaways false
    }
}

function GM_getValue(key: string, defaultValue: any): void {
    if (__storage[key]) {
        return __storage[key].value;
    } else {
        return defaultValue;
    }
}

function GM_setValue(key: string, value: any): void {
    suslLog("Data will be lost after reloading the page");
    if (!__storage[key]) {
        __storage[key] = {
            value,
            listeners: [],
        };
    } else {
        runListeners(key, value);
        __storage[key].value = value;
    }
}

function GM_deleteValue(key: string) {
    delete __storage[key];
}

function GM_listValues() {
    return Object.keys(__storage);
}

function GM_addValueChangeListener(
    name: string,
    callback: (
        name: string,
        oldValue: any,
        newValue: any,
        remote: boolean
    ) => void
): number {
    // listenerId
    const listenerId = __listenerId++;
    if (!__storage[name]) {
        __storage[name] = {
            value: undefined,
            listeners: [],
        };
    }
    __storage[name].listeners.push({
        id: listenerId,
        callback,
    });
    return listenerId;
}

function GM_removeValueChangeListener(listenerId: number) {
    for (const key in __storage) {
        const index = __storage[key].listeners.findIndex(
            (listener) => listener.id === listenerId
        );
        if (index > -1) {
            __storage[key].listeners.splice(index, 1);
        }
    }
}

function GM_openInTab(url: string, options?: any) {
    if (options === undefined) {
        suslLog(
            "GM_openInTab is not fully implemented yet. Opening in new tab."
        );
    }
    window.open(url);
    return new Proxy(
        { close() {}, onclose() {} },
        {
            set(target, property, value, receiver) {
                suslLog("GM_openInTab 's callback is not availiable");
                return false;
            },
        }
    );
}

function GM_registerMenuCommand(
    caption: string,
    onClick: () => MouseEvent | KeyboardEvent
) {
    const li = document.createElement("li");
    li.style.cssText = `display:inline-block;cursor:pointer;`;
    li.textContent = caption;
    li.addEventListener("click", onClick);
    suslMenu.__menu.appendChild(li);
}

function GM_unregisterMenuCommand(caption: string) {
    const li = suslMenu.__menu.querySelector(`li:contains(${caption})`);
    if (li) {
        li.remove();
    }
}

function GM_addElement(tagName: string, attributes?: any): HTMLElement;
function GM_addElement(
    parentNode: Node | Element | ShadowRoot,
    tagName: string,
    attributes?: any
): HTMLElement;
function GM_addElement(
    parentNode: Node | Element | ShadowRoot | string,
    tagName: string | any,
    attributes?: any
): HTMLElement {
    if (typeof parentNode === "string") {
        // script, link, style, meta, ...
        attributes = {};
        tagName = parentNode;
        parentNode = undefined;
    }
    const element = document.createElement(tagName);
    for (const key in attributes) {
        element[key] = attributes[key];
    }
    if (parentNode !== undefined) {
        (parentNode as Node | Element | ShadowRoot).appendChild(element);
    } else {
        if (
            ["script", "link", "style", "meta"].includes(
                tagName.toLocaleLowerCase()
            )
        ) {
            document.head.appendChild(element);
        } else {
            document.body.appendChild(element);
        }
    }
    return element;
}

function GM_addStyle(css: string): HTMLStyleElement {
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);
    return style;
}

interface GM_xmlhttpRequest_options {
    readonly url: string;
    method?: string;
    user?: string;
    password?: string;
    overrideMimeType?: string;
    headers?: object;
    responseType?: "text" | "json" | "blob" | "arraybuffer" | "document";
    timeout?: number;
    data?: string | FormData | Blob;
    binary?: boolean;
    context?: any;
    anonymous?: boolean;
}
interface GM_xmlhttpRequest_callbacks {
    onabort?: (any: any) => any;
    onerror?: (any: any) => any;
    onload?: (any: any) => any;
    onloadend?: (any: any) => any;
    onloadstart?: (any: any) => any;
    onprogress?: (any: any) => any;
    onreadystatechange?: (any: any) => any;
    ontimeout?: (any: any) => any;
}
interface GM_xmlhttpRequest
    extends GM_xmlhttpRequest_options,
        GM_xmlhttpRequest_callbacks {}

function GM_xmlhttpRequest(details: GM_xmlhttpRequest): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    Object.assign(xhr, details);
    const url = new URL(details.url);
    url.username = details.user;
    url.password = details.password;
    for (const [k, v] of Object.entries(details.headers))
        xhr.setRequestHeader(k, v);

    xhr.open(details.method || "GET", url.toString());
    return xhr;
}
interface GM_download extends GM_xmlhttpRequest_callbacks {
    url: string;
    name?: string;
}
function GM_download(url: string, name: string): void;
function GM_download(options: GM_download): void;
function GM_download(url: any, name?: string): void {
    let obj: any = Object.create(null);
    if (typeof url === "object") {
        obj = url;
        url = obj.url;
        name = obj.name;
        if (obj.onload) {
            suslLog("GM_download cannot be implemented. Callback directly");
            obj.onload();
        }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name || url;
}

export { injectGM, suslMenu };
