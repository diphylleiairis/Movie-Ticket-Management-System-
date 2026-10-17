import { Component, type ReactNode } from "react";
import ErrorPage from "./error-page";

export default class PageErrorBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? <ErrorPage status={500} /> : this.props.children;
	}
}
