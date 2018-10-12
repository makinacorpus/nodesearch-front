
export const DEFAULT_ENTITY = 'node';

export interface Search {
    page?: number;
    limit?: number;
    entity?: string;
    search?: string;
    sort_field?: string;
    sort_order?: string;
    types?: string[];
}

export interface ResultItem {
    readonly id: string;
    readonly title: string;
    readonly status: number;
    readonly created: string;
    readonly updated: string;
    readonly type: string;
    readonly human_type: string;
    readonly image: string;
}

export function createResultItemStub(id: string): ResultItem {
    return {
        id: id,
        title: id,
        status: 0,
        created: "",
        updated: "",
        type: "",
        human_type: "",
        image: "",
    };
}

export function createSearch(defaults?: Search, result?: Result): Search {
    defaults = defaults || {};
    if (result) {
        defaults.page = defaults.page || result.page;
        defaults.search = defaults.search || result.search;
        defaults.sort_field = defaults.sort_field || result.sort_field;
        defaults.sort_order = defaults.sort_order || result.sort_order;
    }
    return defaults;
}

export interface Result extends Search {
    readonly limit: number;
    readonly page: number;
    /* readonly */ result: ResultItem[];
    /* readonly */ total: number;
    readonly types: string[];
    readonly types_all: any;
}

function encodeComponent(name: string, value: any): string {
    return `${encodeURIComponent(name)}=${encodeURIComponent(value.toString())}`;
}

export function doSearch(search: Search): Promise<Result> {
    return new Promise<Result>((resolve: (result: Result) => void, reject: (err: any) => void) => {

        const parameters: string[] = [];
        parameters.push(encodeComponent('entity', search.entity || DEFAULT_ENTITY));
        if (search.page) {
            parameters.push(encodeComponent('page', search.page));
        }
        if (search.limit) {
            parameters.push(encodeComponent('limit', search.limit));
        }
        if (search.search) {
            parameters.push(encodeComponent('search', search.search));
        }
        if (search.sort_field) {
            parameters.push(encodeComponent('sort_field', search.sort_field));
        }
        if (search.sort_order) {
            parameters.push(encodeComponent('sort_order', search.sort_order));
        }
        if (search.types) {
            parameters.push(encodeComponent('type', search.types.join('|')));
        }

        const req = new XMLHttpRequest();
        req.open('GET', '/ajax/node/search?' + parameters.join('&'));
        req.setRequestHeader("Accept", "application/json" );
        req.addEventListener("load", () => {
            if (req.status !== 200) {
                reject(`${req.status}: ${req.statusText}: ${req.responseText}`);
            } else {
                try {
                    const result = <Result>JSON.parse(req.responseText);
                    // Populate mandatory parameters to ensure that the caller
                    // will always have something to NOT crash upon.
                    if (!result.result) {
                        result.result = [];
                    }
                    if (!result.total) {
                        result.total = 0;
                    }
                    resolve(result);
                } catch (error) {
                    reject(`${req.status}: ${req.statusText}: cannot parse JSON: ${error}`);
                }
            }
        });
        req.addEventListener("error", () => {
            reject(`${req.status}: ${req.statusText}: ${req.responseText}`);
        });
        req.send();
    });
}
