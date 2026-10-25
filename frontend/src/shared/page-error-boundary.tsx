import { Component, type ReactNode } from "react";
import ErrorPage from "./error-page";

export default class PageErrorBoundary extends Component<
	{ children: ReactNode; resetKey: string },
	{ failed: boolean; resetKey: string }
> {
	state = { failed: false, resetKey: this.props.resetKey };
	static getDerivedStateFromProps(props: { resetKey: string }, state: { resetKey: string }) {
		return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
	}
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? <ErrorPage status={500} /> : this.props.children;
	}
}
