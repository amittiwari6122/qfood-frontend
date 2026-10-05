import { Component } from 'react';

/** Shows a message instead of a blank white page if a screen crashes. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('[ui]', error); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card mx-auto mt-10 max-w-md p-6 text-center">
        <p className="font-semibold">Something went wrong on this page</p>
        <p className="mt-1 text-sm text-ink-faint">{String(this.state.error?.message || this.state.error)}</p>
        <button className="btn-primary mt-4" onClick={() => { this.setState({ error: null }); }}>Try again</button>
      </div>
    );
  }
}
