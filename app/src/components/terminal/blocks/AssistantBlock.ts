import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { RESET, wordWrap, formatMarkdownLine, fg, highlightCode, sanitizeAgentText, isTableLine, formatTable } from "../AnsiUtils";

export class AssistantBlock implements Block {
  readonly type = "assistant";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;
  streaming = true;

  constructor(public readonly id: string, public text: string, streaming: boolean) {
    this.streaming = streaming;
  }

  append(chunk: string): void {
    this.text += chunk;
  }

  finalize(): void {
    this.streaming = false;
  }

  render(cols: number, palette: TerminalPalette): string {
    const sanitized = sanitizeAgentText(this.text).replace(/\s+$/, "");
    const lines: string[] = [];
    let inCodeBlock = false;
    let codeLang = "";
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        lines.push(...formatTable(tableBuffer, palette));
        tableBuffer = [];
      }
    };

    for (const rawLine of sanitized.split("\n")) {
      if (rawLine.startsWith("```")) {
        flushTable();
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = rawLine.slice(3).trim();
          lines.push(`  ${fg(palette.textDim)}${"─".repeat(Math.min(cols - 4, 38))}${codeLang ? ` ${codeLang}` : ""}${RESET}`);
        } else {
          inCodeBlock = false;
          codeLang = "";
          lines.push(`  ${fg(palette.textDim)}${"─".repeat(Math.min(cols - 4, 38))}${RESET}`);
        }
        continue;
      }

      if (inCodeBlock) {
        lines.push(`  ${highlightCode(rawLine, palette)}`);
      } else if (isTableLine(rawLine)) {
        tableBuffer.push(rawLine);
      } else {
        flushTable();
        // Add blank line before headers (spacing managed here, not in formatMarkdownLine)
        if (/^#{1,6}\s/.test(rawLine)) lines.push("");
        // wordWrap on plain text first (ANSI bytes break column counting),
        // then apply markdown formatting per wrapped line
        const wrapped = wordWrap(rawLine, cols - 1);
        lines.push(...wrapped.map(w => formatMarkdownLine(w, palette)));
        if (/^#{1,6}\s/.test(rawLine)) lines.push("");
      }
    }
    flushTable();

    return lines.join("\r\n") + "\r\n";
  }
}
