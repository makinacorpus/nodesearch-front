
import * as React from "react";
import { translate } from "../core";

export interface DialogProps {
    readonly title: string;
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
                                <span className="sr-only">{translate("close")}</span>
                            </button>
                        </h1>
                        <div className="content">{this.props.children}</div>
                    </div>
                </div>
            </div>
        );
    }
}
