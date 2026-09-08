import React from "react";

// Catches any rendering error in the app and shows it on screen instead of
// leaving a blank/black page. This makes it possible to read the error
// message directly, without needing to open the browser console (F12).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // info.componentStack lists the real (non-minified) component names
    // where the error happened, even in a production build — much more
    // useful than error.stack alone when the JS bundle is minified.
    this.setState({ info });
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#090B10", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, fontFamily: "monospace",
        }}>
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ color: "#FF4655", fontSize: 20, marginBottom: 12 }}>Ocorreu um erro na tela</h1>
            <p style={{ color: "#94A3B8", marginBottom: 12 }}>
              Copie o texto abaixo e envie para o suporte — isso mostra exatamente o que aconteceu:
            </p>
            <pre style={{
              background: "#151821", padding: 16, borderRadius: 8,
              whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13,
              color: "#FBBF24", maxHeight: 300, overflow: "auto",
            }}>
              {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
            </pre>
            {this.state.info && this.state.info.componentStack && (
              <>
                <p style={{ color: "#94A3B8", margin: "16px 0 8px" }}>Em qual componente aconteceu:</p>
                <pre style={{
                  background: "#151821", padding: 16, borderRadius: 8,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13,
                  color: "#00D2FF", maxHeight: 300, overflow: "auto",
                }}>
                  {this.state.info.componentStack}
                </pre>
              </>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16, background: "#00D2FF", color: "#090B10", border: "none",
                padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
