
import * as Core from "../core";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog } from "./dialog";
import { Pager } from "./pager";
import { Result, ResultItem, Search } from "../core";
import { ResultPreviewList } from "./preview";

const WIDGET_DEFAULT_LIMIT = 18;

/**
 * Widget properties
 */
export interface WidgetProps {
    /**
     * Default values
     */
    readonly values: (string | ResultItem)[];

    /**
     * Widget title
     */
    readonly title?: string;

    /**
     * Entity type to query
     */
    readonly entityType: string;

    /**
     * Open dialog button title
     */
    readonly buttonTitle?: string;

    /**
     * Search box placeholder
     */
    readonly placeholder?: string;

    /**
     * Minimum item count
     */
    readonly minCount?: number;

    /**
     * Maximum item count
     */
    readonly maxCount?: number;

    /**
     * Allowed item types
     */
    readonly types?: string[],

    /**
     * A new value has been selected by the user, if undefined or empty this
     * means the user clicked the "remove" button.
     */
    readonly onUpdate: (values: ResultItem[]) => void;

    /**
     * Number of results to display per page
     */
    readonly limit?: number;
};

/**
 * Widget state
 */
interface WidgetState {
    dialogOpened?: boolean;
    result?: Result;
    defaults: ResultItem[]; // Defaults before widget spawn
    previous: ResultItem[]; // Value since last selection
    values: ResultItem[]; // Current temporary values
};

/**
 * Selector widget, see WidgetProps documentation for options
 */
export class SelectorWidget extends React.Component<WidgetProps, WidgetState> {

    constructor(props: WidgetProps) {
        super(props);

        const values = this.props.values.map((item): ResultItem => {
            if ("string" === typeof item) {
                return Core.createResultItemStub(item);
            }
            return item;
        });

        this.state = {
            defaults: values.concat([]), // Array copy
            previous: values.concat([]), // Array copy
            values: values,
        };

        this.onCancelClick = this.onCancelClick.bind(this);
        this.onCloseClick = this.onCloseClick.bind(this);
        this.onOpenClick = this.onOpenClick.bind(this);
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
            let index: number;
            while (-1 !== (index = current.indexOf(bundle))) {
                current.splice(index, 1);
            }
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

        this.props.onUpdate(values);
        this.setState({values: values});
    }

    private valueRemove(value: ResultItem) {
        const values = this.state.values.filter(item => value.id !== item.id);
        this.props.onUpdate(values);
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
        // Copy current values as being the previously accepted set
        // of values, so that cancel will restore that instead of
        // restoring defaults.
        this.setState({dialogOpened: false, previous: this.state.values.concat([])});
    }

    private onOpenClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.setState({dialogOpened: true});
        this.refresh();
    }

    private onCancelClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.props.onUpdate(this.state.previous); // Restore defaults
        this.setState({dialogOpened: false, values: this.state.previous});
        this.refresh();
    }

    private onResetClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        this.props.onUpdate(this.state.defaults); // Restore defaults
        this.setState({dialogOpened: false, values: this.state.defaults});
        this.refresh();
    }

    render() {
        let dialog = null;
        const active = this.state.values.map((item) => item.id);
        const result = this.state.result ? this.state.result.result : [];

        if (this.state.dialogOpened) {
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
                    checkboxes.push(<label><input type="checkbox" checked={checked} key={"filter-" + bundle} name={bundle} onClick={(event) => this.typeFilter(bundle, event.currentTarget.checked)}/>&nbsp;{label}</label>);
                }
            }

            dialog = (
                <Dialog title={this.props.title || "Search content"} doClose={this.onCloseClick}>
                    <input
                        name="search"
                        onChange={this.onSearchChange}
                        placeholder={this.props.placeholder || "Type here some text to search content..."}
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
                        <h2>Current selection</h2>
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
                            Cancel
                        </button>
                        <button className="button btn btn-danger" name="submit" onClick={this.onResetClick}>
                            Reset to defaults
                        </button>
                        <button className="button btn btn-success pull-right" name="submit" onClick={this.onCloseClick}>
                            Select
                        </button>
                    </div>
                </Dialog>
            );
        }

        return (
            <div className="node-selector">
                <ResultPreviewList
                    active={active}
                    data={this.state.values}
                    onItemSort={() => {}}
                    sortable
                />
                <button className="btn btn-default" onClick={this.onOpenClick}>
                    {this.props.buttonTitle || "Select"}
                </button>
                {dialog}
            </div>
        );
    }
}

/**
 * Spawn the dialog in the given element.
 */
export function SelectorWidgetInit(target: HTMLInputElement) {

    // Find a default value
    const defaults: (string | ResultItem)[] = [];
    const stringValue = target.value.trim();

    // I am not proud of this one, but I needed a way to plug it in to raw HTML
    // for users that don't work with React.
    if (stringValue.length) {
        const idList = target.value.split(',');
        if (target.hasAttribute("data-default")) {
            try {
                const candidates = JSON.parse(target.getAttribute("data-default") || "");
                for (let id of idList) {
                    let found = false;
                    for (let candidate of candidates) {
                        if (candidate.id === id) {
                            found = true;
                            defaults.push(candidate);
                        }
                    }
                    if (!found) {
                        defaults.push(id);
                    }
                }
            } catch (error) {
                console.log(`error while reading the data-default attribute: ${error}`)
                idList.map(id => defaults.push(id));
            }
        } else {
            idList.map(id => defaults.push(id));
        }
    }

    const props = {
        title: target.getAttribute("title") || target.getAttribute("data-title") || "",
        entityType: target.getAttribute("data-entity") || "node",
        values: defaults,
        placeholder: target.getAttribute("placeholder") || target.getAttribute("data-placeholder") || "",
        minCount: parseInt(target.getAttribute("data-min") || "") || 0,
        maxCount: parseInt(target.getAttribute("data-max") || "") || 0,
        types: (target.getAttribute("data-bundle") || "").split(",").map(value => value.trim()).filter((value) => value.length),
        // Restore values into the hidden widget, that will be really POST'ed.
        onUpdate: (values: ResultItem[]) => target.value = values.map(item => item.id).join(","),
    };

    let element: HTMLElement = target.ownerDocument.createElement('div');
    if (target.parentElement) {
        target.parentElement.insertBefore(element, target);
    } else {
        element = target;
    }

    ReactDOM.render(<SelectorWidget{...props}/>, element);
}
