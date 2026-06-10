import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './App.css'

window.onerror = function (msg, url, line, col, error) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="color:red; background:black; position:fixed; z-index:9999; padding:20px; top:0; left:0; width:100%;">
        <h3>Runtime Error</h3>
        <p>${msg}</p>
        <pre>${error ? error.stack : ''}</pre>
      </div>`;
  }
};

window.addEventListener("unhandledrejection", function (e) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="color:red; background:black; position:fixed; z-index:9999; padding:20px; top:0; left:0; width:100%;">
        <h3>Unhandled Promise Rejection</h3>
        <p>${e.reason && e.reason.message ? e.reason.message : e.reason}</p>
        <pre>${e.reason && e.reason.stack ? e.reason.stack : ''}</pre>
      </div>`;
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "red", padding: "20px", background: "#222", height: "100vh" }}>
          <h2>React Render Error</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ overflow: "auto", padding: "10px", background: "black" }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
