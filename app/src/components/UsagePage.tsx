import { memo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./UsagePage.css";

interface DayStats {
  date: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  messages: number;
  cost: number;
}

interface ModelStats {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  messages: number;
  cost: number;
}

interface TotalStats {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  messages: number;
  sessions: number;
  cost: number;
}

interface TokenUsageStats {
  days: DayStats[];
  models: ModelStats[];
  totals: TotalStats;
}

interface UsagePageProps {
  tabId: string;
  onRequestClose: (tabId: string) => void;
  isActive: boolean;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function fmtCost(n: number): string {
  return "$" + n.toFixed(2);
}

function pad(s: string, len: number): string {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : " ".repeat(len - s.length) + s;
}

function Banner({ title }: { title: string }) {
  return (
    <div className="gsd-banner">
      <div className="gsd-banner-bar" />
      <div className="gsd-banner-title">ANVIL ► {title}</div>
      <div className="gsd-banner-bar" />
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="gsd-box"><pre>{children}</pre></div>;
}

function Sep() {
  return <div className="gsd-sep" />;
}

function buildTotalsBox(t: TotalStats): string {
  return `  Input Tokens       ${padLeft(fmtTokens(t.input_tokens), 10)}
  Output Tokens      ${padLeft(fmtTokens(t.output_tokens), 10)}
  Cache Write        ${padLeft(fmtTokens(t.cache_creation_tokens), 10)}
  Cache Read         ${padLeft(fmtTokens(t.cache_read_tokens), 10)}
  Messages           ${padLeft(t.messages.toLocaleString(), 10)}
  Sessions           ${padLeft(t.sessions.toLocaleString(), 10)}
  Total Cost         ${padLeft(fmtCost(t.cost), 10)}`;
}

function buildModelsTable(models: ModelStats[]): string {
  if (models.length === 0) return "  No model data";
  const header = `  ${pad("Model", 10)} ${padLeft("Input", 9)} ${padLeft("Output", 9)} ${padLeft("Cache W", 9)} ${padLeft("Cache R", 9)} ${padLeft("Msgs", 6)} ${padLeft("Cost", 9)}`;
  const sep = "  " + "\u2500".repeat(header.length - 2);
  const rows = models.map((m) =>
    `  ${pad(m.model, 10)} ${padLeft(fmtTokens(m.input_tokens), 9)} ${padLeft(fmtTokens(m.output_tokens), 9)} ${padLeft(fmtTokens(m.cache_creation_tokens), 9)} ${padLeft(fmtTokens(m.cache_read_tokens), 9)} ${padLeft(m.messages.toLocaleString(), 6)} ${padLeft(fmtCost(m.cost), 9)}`
  );
  return [header, sep, ...rows].join("\n");
}

function buildDaysChart(days: DayStats[]): string {
  if (days.length === 0) return "  No data for this period";
  const maxCost = Math.max(...days.map((d) => d.cost), 0.01);
  const barWidth = 30;
  return days
    .map((d) => {
      const barLen = Math.round((d.cost / maxCost) * barWidth);
      const bar = "\u2588".repeat(barLen) + "\u2591".repeat(barWidth - barLen);
      return `  ${d.date}  ${bar}  ${padLeft(fmtCost(d.cost), 8)}  ${padLeft(fmtTokens(d.input_tokens + d.output_tokens + d.cache_creation_tokens + d.cache_read_tokens), 8)} tok`;
    })
    .join("\n");
}

function UsagePage({ tabId, onRequestClose, isActive }: UsagePageProps) {
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<TokenUsageStats>("get_token_usage")
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.ctrlKey && e.key === "u")) {
        e.preventDefault();
        onRequestClose(tabId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, tabId, onRequestClose]);

  if (error) {
    return (
      <div className="usage-page">
        <div className="about-terminal">
          <Banner title="ERROR" />
          <Box>{`  ${error}`}</Box>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="usage-page">
        <div className="about-terminal">
          <Banner title="TOKEN USAGE" />
          <Box>{"  Loading..."}</Box>
        </div>
      </div>
    );
  }

  return (
    <div className="usage-page">
      <div className="about-terminal">
        <div className="usage-header">TOKEN USAGE</div>

        <Banner title="TOTALS (7 DAYS)" />
        <Box>{buildTotalsBox(stats.totals)}</Box>

        <Banner title="BY MODEL" />
        <Box>{buildModelsTable(stats.models)}</Box>

        <Banner title="LAST 7 DAYS" />
        <pre className="gsd-text">{buildDaysChart(stats.days)}</pre>

        <div className="gsd-footer">
          <Sep />
          <div className="gsd-footer-text">Press Esc or Ctrl+U to close</div>
          <Sep />
        </div>
      </div>
    </div>
  );
}

export default memo(UsagePage);
