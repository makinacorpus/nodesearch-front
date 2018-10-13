
import * as Core from "../core";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog } from "./dialog";
import { Pager } from "./pager";
import { Result, ResultItem, Search } from "../core";
import { ResultPreviewList } from "./preview";
import { translate } from "../core";

const WIDGET_DEFAULT_LIMIT = 18;

/**
 * This API is about selecting value; this handler will be common to all widgets.
 */
type UpdateHandler = (values: ResultItem[]) => void;

/**
 * From the given element, read data attributes to determine the widget props.
 */
function normalizePropsFromElement(target: HTMLElement, onUpdate: UpdateHandler): SelectorWidgetProps {
    return {
        entityType: target.getAttribute("data-entity") || "node",
        labels: Core.findLabelsOnElement(target),
        maxCount: parseInt(target.getAttribute("data-max") || "", 10) || 0,
        minCount: parseInt(target.getAttribute("data-min") || "", 10) || 0,
        onUpdate: onUpdate,
        types: (target.getAttribute("data-bundle") || "").split(",").map(value => value.trim()).filter((value) => value.length),
        values: normalizeStringValueFromElement(target, "data-default"),
    };
}

/**
 * Clones props and override default update function
 */
function clonePropsWith(props: SelectorWidgetProps, onUpdate: UpdateHandler): SelectorWidgetProps {
    return {
        entityType: props.entityType,
        labels: props.labels,
        limit: props.limit,
        maxCount: props.maxCount,
        minCount: props.minCount,
        onUpdate: onUpdate,
        types: props.types,
        values: props.values,
    };
}

/**
 * From the given HTML INPUT element, derive default values.
 *
 * The element value must be a coma-separated list of identifiers as a raw
 * string, default item details may be pushed as JSON keyed by identifiers
 * stringified within the "data-default" attribute (or any other provided
 * as a parameter to this function).
 */
function normalizeStringValueFromElement(target: HTMLElement, attribute?: string): ResultItem[] {
    const defaults: ResultItem[] = [];

    // I am not proud of this one, but I needed a way to plug it in to raw HTML
    // for users that don't work with React.
    if (target instanceof HTMLInputElement && target.value.length) {
        const idList = target.value.split(',');

        if (target.hasAttribute("data-default")) {
            try {
                const candidates = JSON.parse(target.getAttribute(attribute || "data-default") || "");
                for (let id of idList) {
                    let found = false;
                    for (let candidate of candidates) {
                        if (candidate.id === id) {
                            found = true;
                            defaults.push(candidate);
                        }
                    }
                    if (!found) {
                        defaults.push(Core.createResultItemStub(id));
                    }
                }
            } catch (error) {
                console.log(`error while reading the data-default attribute: ${error}`)
                idList.map(id => defaults.push(Core.createResultItemStub(id)));
            }
        } else {
            idList.map(id => defaults.push(Core.createResultItemStub(id)));
        }
    }

    return defaults;
}

/**
 * Widget properties
 */
export interface SelectorWidgetProps {
    readonly entityType: string;
    readonly labels: any;
    readonly limit?: number;
    readonly maxCount?: number;
    readonly minCount?: number;
    readonly onUpdate: UpdateHandler;
    readonly types?: string[],
    readonly values: ResultItem[];
};

/**
 * Widget state
 */
interface SelectorWidgetState {
    dialogOpened: boolean,
    values: ResultItem[];
};

/**
 * Selector widget, see WidgetProps documentation for options
 */
export class SelectorWidget extends React.Component<SelectorWidgetProps, SelectorWidgetState> {

    constructor(props: SelectorWidgetProps) {
        super(props);

        this.state = {dialogOpened: false, values: this.props.values};

        this.onCloseClick = this.onCloseClick.bind(this);
        this.onOpenClick = this.onOpenClick.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
    }

    private onUpdate(values: ResultItem[]) {
        this.setState({values: values});
    }

    private onCloseClick() {
        this.setState({dialogOpened: false});
    }

    private onOpenClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.setState({dialogOpened: true});
    }

    render() {
        let dialog = null;
        const active = this.state.values.map((item) => item.id);

        if (this.state.dialogOpened) {
            const props = clonePropsWith(this.props, (values) => {
                this.setState({values: values});
                this.props.onUpdate(values);
            });
            dialog = (<SelectorDialog{...props} onClose={this.onCloseClick}/>);
        }

        return (
            <div className="node-selector">
                <ResultPreviewList active={active} data={this.state.values} onItemSort={() => {}} sortable/>
                <button className="btn btn-default" onClick={this.onOpenClick}>{translate("open")}</button>
                {dialog}
            </div>
        );
    }
}

/**
 * Selector dialog
 */
interface SelectorDialogState {
    result?: Result;
    defaults: ResultItem[]; // Defaults before widget spawn
    previous: ResultItem[]; // Value since last selection
    values: ResultItem[]; // Current values
};

/**
 * Selector dialog state
 */
interface SelectorDialogProps extends SelectorWidgetProps {
    readonly onClose: () => void;
}

/**
 * Selector widget, see WidgetProps documentation for options
 */
export class SelectorDialog extends React.Component<SelectorDialogProps, SelectorDialogState> {

    constructor(props: SelectorDialogProps) {
        super(props);

        const values = this.props.values;
        this.state = {
            defaults: values.concat([]), // Array copy
            previous: values.concat([]), // Array copy
            values: values,
        };

        this.onCancelClick = this.onCancelClick.bind(this);
        this.onCloseClick = this.onCloseClick.bind(this);
        this.onResetClick = this.onResetClick.bind(this);
        this.onSearchChange = this.onSearchChange.bind(this);
        this.typeFilter = this.typeFilter.bind(this);
        this.valueAdd = this.valueAdd.bind(this);
        this.valueRemove = this.valueRemove.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    private refresh(search?: Search) {
        search = search || {};
        search.entity = this.props.entityType;
        // Do not loose the current filters, only override.
        search.limit = search.limit || this.props.limit || WIDGET_DEFAULT_LIMIT;
        search.types = search.types || this.props.types;
        search = Core.createSearch(search, this.state.result);
        // Where the magic happens
        Core.doSearch(search)
            .then((result) => this.setState({result: result}))
            .catch((error) => console.log(error))
        ;
    }

    private typeFilter(bundle: string, checked: boolean) {
        let current = this.state.result ? this.state.result.types : [];

        if (checked) {
            if (-1 === current.indexOf(bundle)) {
                current = current.concat([bundle]);
            }
        } else {
            current = current.filter(value => value !== bundle);
        }

        this.refresh({types: current.length ? current : this.props.types});
    }

    private valueAdd(value: ResultItem) {
        let values;

        if (this.props.maxCount === 1) {
            values = [value];
        } else if (this.props.maxCount && this.state.values.length >= this.props.maxCount) {
            // Do nothing, sorry.
            values = this.state.values;
        } else {
            values = this.state.values.concat([value]);
        }

        this.setState({values: values});
    }

    private valueRemove(value: ResultItem) {
        const values = this.state.values.filter(item => value.id !== item.id);
        this.setState({values: values});
    }

    private onChangeDebounceTimer: any;

    private onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        // Very primitive implementation of debounce, see
        // https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940
        ((value: string) => {
            clearTimeout(this.onChangeDebounceTimer);
            this.onChangeDebounceTimer = setTimeout(() => this.refresh({page:1, search: value}), 200);
        })(event.target.value);
    }

    private onCloseClick() {
        this.props.onUpdate(this.state.values);
        this.props.onClose();
    }

    private onCancelClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.props.onClose();
    }

    private onResetClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.props.onUpdate(this.state.defaults);
        this.props.onClose();
    }

    render() {
        const active = this.state.values.map((item) => item.id);
        const result = this.state.result ? this.state.result.result : [];

        const searchValue = this.state.result ? this.state.result.search : "";
        const page = this.state.result ? this.state.result.page : 1;
        const total = this.state.result ? this.state.result.total : 0;
        const limit = this.state.result ? this.state.result.limit : 1;

        const checkboxes = [];
        let types: string[] = [];

        if (this.props.types && this.props.types.length) {
            types = this.props.types;
        } else if (this.state.result) {
            // Defaults to know types returned by the AJAX request
            types = Object.keys(this.state.result.types_all);
        }

        if (1 < types.length) {
            for (let bundle of types) {
                let label = bundle;
                let checked = false;
                if (this.state.result) {
                    label =  this.state.result.types_all[bundle] || bundle;
                    checked = (-1 !== this.state.result.types.indexOf(bundle));
                }
                const onClick = (event: React.ChangeEvent<HTMLInputElement>) => this.typeFilter(bundle, event.currentTarget.checked);
                checkboxes.push(
                    <label key={"label-" + bundle}>
                        <input type="checkbox" checked={checked} key={"filter-" + bundle} name={bundle} onChange={onClick}/>
                        &nbsp;{label}
                    </label>
                );
            }
        }

        return (
            <Dialog title={translate("title")} doClose={this.onCloseClick}>
                <input
                    name="search" onChange={this.onSearchChange}
                    placeholder={translate("placeholder")}
                    type="text"
                    value={searchValue}
                />
                {checkboxes.length ? <div className="filter">{checkboxes}</div> : ''}
                <ResultPreviewList
                    active={active}
                    data={result}
                    onItemClick={this.valueAdd}
                    maxItemCount={this.props.limit || WIDGET_DEFAULT_LIMIT}
                />
                <Pager onClick={(page) => this.refresh({page: page})} autoHide={false} page={page} total={total} limit={limit}/>
                <div className="current">
                    <h2>{translate("current")}</h2>
                    <ResultPreviewList
                        active={active}
                        data={this.state.values}
                        onItemClick={this.valueRemove}
                        maxItemCount={this.props.maxCount}
                        removable
                        sortable
                    />
                </div>
                <div className="footer">
                    <button className="button btn btn-danger" name="submit" onClick={this.onCancelClick}>
                        {translate("cancel")}
                    </button>
                    <button className="button btn btn-danger" name="submit" onClick={this.onResetClick}>
                        {translate("reset")}
                    </button>
                    <button className="button btn btn-success pull-right" name="submit" onClick={this.onCloseClick}>
                        {translate("select")}
                    </button>
                </div>
            </Dialog>
        );
    }
}

/**
 * Spawn a discrete selector, that will open on the given target click and
 * execute the given callback on update.
 */
export function DiscreteWidgetInit(triggeringElement: HTMLElement, onUpdate: UpdateHandler, props?: SelectorWidgetProps) {
    const element: HTMLElement = (triggeringElement.ownerDocument as Document).createElement('div');
    triggeringElement.addEventListener("click", () => {
        ReactDOM.render(<SelectorWidget{...(props || normalizePropsFromElement(triggeringElement, onUpdate))}/>, element);
    });
}

/**
 * Spawn the input selector.
 */
export function SelectorWidgetInit(target: HTMLInputElement) {
    const props = normalizePropsFromElement(target, (values) => target.value = values.map(item => item.id).join(","));
    let element: HTMLElement = (target.ownerDocument as Document).createElement('div');
    if (target.parentElement) {
        target.parentElement.insertBefore(element, target);
    } else {
        element = target;
    }
    ReactDOM.render(<SelectorWidget{...props}/>, element);
}
