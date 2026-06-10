import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Recover when the user navigates to a different page.
    if (this.state.error && prevProps.pathname !== this.props.pathname) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel panel-pad" style={{ margin: 24 }}>
          <h3 className="panel-title">Something went wrong on this page</h3>
          <p style={{ color: "var(--text-soft)" }}>{String(this.state.error?.message || this.state.error)}</p>
          <button className="btn primary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
