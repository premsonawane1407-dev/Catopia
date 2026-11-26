"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

// The map depends on third-party code, remote styles and the browser's graphics, so it is the one screen of
// the preview that can fail for reasons the page does not control. This keeps such a failure inside the Map
// screen: the sidebar, the top bar and the other screens stay up, and a retry rebuilds the map from scratch.
export default class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Catopia map crashed and was contained by its error boundary.", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <section className="cp-cat-map-page">
        <div className="cp-map-status is-error" role="alert">
          <span>The map hit a problem and stopped. The rest of Catopia is still working.</span>
          <button className="cp-map-retry" onClick={() => this.setState((current) => ({ failed: false, attempt: current.attempt + 1 }))}>Try again</button>
        </div>
      </section>;
    }
    // Changing the key on retry discards the failed map's state instead of reusing it.
    return <div key={this.state.attempt} style={{ display: "contents" }}>{this.props.children}</div>;
  }
}
