import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

import { TerminalIcon } from "./Icons";

interface TerminalPanelProps {
  sessionId: string | null;
  isPreparing: boolean;
  error: string | null;
}

export function TerminalPanel({ sessionId, isPreparing, error }: TerminalPanelProps) {
  const terminalHost = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId || !terminalHost.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 14,
      fontWeight: "400",
      lineHeight: 1.35,
      scrollback: 1500,
      allowTransparency: true,
      theme: {
        background: "#101412",
        foreground: "#d7ded9",
        cursor: "#a8e672",
        cursorAccent: "#101412",
        selectionBackground: "#31543b",
        black: "#202622",
        red: "#ff7b72",
        green: "#a8e672",
        yellow: "#e7c978",
        blue: "#86b9e8",
        magenta: "#c9a0dc",
        cyan: "#76c7b7",
        white: "#e7ece8",
        brightBlack: "#667069"
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalHost.current);
    fitAddon.fit();
    terminal.write("\x1b[38;5;245mPreparando seu terminal Linux...\x1b[0m\r\n");

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/api/terminal?sessionId=${encodeURIComponent(sessionId)}`
    );
    socket.binaryType = "arraybuffer";
    let receivedFirstChunk = false;

    socket.addEventListener("open", () => {
      setConnected(true);
      socket.send(`\u0000resize:${terminal.cols}x${terminal.rows}`);
    });

    socket.addEventListener("message", (event) => {
      if (!receivedFirstChunk) {
        terminal.reset();
        terminal.write("\x1b[38;5;114mAmbiente pronto. Boa prática!\x1b[0m\r\n\r\n");
        receivedFirstChunk = true;
      }
      const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : event.data;
      terminal.write(data);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
      terminal.write("\r\n\x1b[38;5;203mTerminal desconectado.\x1b[0m\r\n");
    });

    socket.addEventListener("error", () => {
      terminal.write("\r\n\x1b[38;5;203mNão foi possível conectar ao terminal.\x1b[0m\r\n");
    });

    const inputDisposable = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    });
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(`\u0000resize:${cols}x${rows}`);
    });
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(terminalHost.current);

    return () => {
      resizeObserver.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      socket.close();
      terminal.dispose();
      setConnected(false);
    };
  }, [sessionId]);

  return (
    <section className="terminal-panel" aria-label="Terminal Linux">
      <header className="terminal-header">
        <div className="terminal-title">
          <TerminalIcon />
          <span>Terminal</span>
          <span className={`connection-pill ${connected ? "is-online" : ""}`}>
            <span className="status-dot" />
            {connected ? "Ambiente ativo" : isPreparing ? "Preparando" : "Desconectado"}
          </span>
        </div>
        <div className="window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>
      <div className="terminal-stage">
        {error ? (
          <div className="terminal-error">
            <strong>Não foi possível iniciar o ambiente</strong>
            <span>{error}</span>
          </div>
        ) : null}
        {isPreparing && !sessionId ? (
          <div className="terminal-loading">
            <span className="loader" />
            <strong>Criando um Linux limpo para esta lição</strong>
            <span>Isso pode levar alguns segundos.</span>
          </div>
        ) : null}
        <div className="terminal-host" ref={terminalHost} />
      </div>
      <footer className="terminal-footer">
        <span>Ambiente isolado</span>
        <span className="keyboard-tip"><kbd>Ctrl</kbd> + <kbd>L</kbd> limpa a tela</span>
      </footer>
    </section>
  );
}
