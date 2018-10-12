
import * as React from "react";

export interface DialogProps {
    /**
     * Dialog title
     */
    readonly title: string;

    /**
     * Close button label (hidden, but displayed by scren readers)
     */
    readonly closeLabel?: string;

    /**
     * Close dialog handler: you must hide dialog when this is clicked.
     */
    readonly doClose: () => void;
};

export class Dialog extends React.Component<DialogProps> {
    render() {
        return (
            <div className="node-selector-dialog">
                <div className="overlay"/>
                <div className="dialog">
                    <div className="inner">
                        <h1 className="title">
                            {this.props.title}
                            <button name="close" onClick={this.props.doClose}>
                                &times;
                                <span className="sr-only">{this.props.closeLabel || "Close"}</span>
                            </button>
                        </h1>
                        <div className="content">{this.props.children}</div>
                    </div>
                </div>
            </div>
        );
    }
}
