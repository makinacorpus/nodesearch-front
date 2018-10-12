
import * as React from "react";

export interface PagerProps {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly linkCount?: number;
    readonly onClick: (page: number) => void;
    readonly autoHide?: boolean;
    readonly ariaLabel?: string;
    readonly className?: string;
    readonly previousLabel?: string;
    readonly nextLabel?: string;
}

export class Pager extends React.Component<PagerProps> {
    render() {
        // Auto-hide if there is only one page
        if (this.props.autoHide && this.props.total <= this.props.limit) {
            return null;
        }

        // Build page links if revelant
        const pageLinks = [];
        const pageCount = Math.ceil(this.props.total / this.props.limit);

        const count = this.props.linkCount || 5;
        const median = Math.floor(count / 2);
        const start = Math.max(1, this.props.page - median);
        const end = Math.min(start + count, pageCount);

        for (let i = start; i <= end; i++) {
            if (this.props.page === i) {
                pageLinks.push(<li key={i} className="active"><a onClick={() => {this.props.onClick(i)}} href="#">{i}</a></li>);
            } else {
                pageLinks.push(<li key={i}><a onClick={() => {this.props.onClick(i)}} href="#">{i}</a></li>);
            }
        }

        let firstPageLink = null, lastPageLink = null;
        if (pageCount > 1) {
            if (this.props.page === 1) {
                firstPageLink = (
                    <li className="disabled">
                        <a key="first" href="#" aria-label={this.props.previousLabel || "Previous"}>
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                );
            } else {
                firstPageLink = (
                    <li>
                        <a key="first" onClick={() => {this.props.onClick(1)}} href="#" aria-label={this.props.previousLabel || "Previous"}>
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                );
            }
            if (this.props.page === pageCount) {
                lastPageLink = (
                    <li>
                        <a key="first" onClick={() => {this.props.onClick(pageCount)}} href="#" aria-label={this.props.nextLabel || "Next"}>
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                );
            } else {
                lastPageLink = (
                    <li className="disabled">
                        <a href="#" aria-label={this.props.nextLabel || "Next"}>
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                );
            }
        }

        return (
            <nav className={this.props.className || "pager-nav"} aria-label={this.props.ariaLabel || "Page navigation"}>
                <ul className="pagination">
                    {firstPageLink}
                    {pageLinks}
                    {lastPageLink}
                </ul>
            </nav>
        );
    }
}
