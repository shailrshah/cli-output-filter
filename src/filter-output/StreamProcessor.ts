import { FilterManager } from './FilterManager';
import { StatsTracker } from './StatsTracker';
import { Stream } from './types';

export class StreamProcessor {
  private static readonly MAX_BUFFER_BYTES = 1024 * 512; // 512KB limit
  private static readonly RATE_LIMIT_LINES_PER_SECOND = 10000; // Increased for large builds
  private static readonly RATE_LIMIT_RESET_INTERVAL_MS = 1000;

  private stdoutRemaining = '';
  private stderrRemaining = '';
  private processedLines = 0;
  private lastReset = Date.now();

  constructor(private filterManager: FilterManager, private statsTracker: StatsTracker) {}

  processData(data: Buffer, stream: Stream): void {
    const remaining = stream === Stream.STDOUT ? this.stdoutRemaining : this.stderrRemaining;

    // Reset rate limit counter every second
    const now = Date.now();
    if (now - this.lastReset > StreamProcessor.RATE_LIMIT_RESET_INTERVAL_MS) {
      this.processedLines = 0;
      this.lastReset = now;
    }

    // Apply rate limiting
    if (this.processedLines > StreamProcessor.RATE_LIMIT_LINES_PER_SECOND) {
      throw new Error('Rate limit exceeded');
    }

    // Check total buffer size
    if (remaining.length + data.length > StreamProcessor.MAX_BUFFER_BYTES) {
      this.clearBuffer(stream);
      throw new Error(`Buffer size exceeded ${StreamProcessor.MAX_BUFFER_BYTES} bytes`);
    }

    // Process data with proper cleanup
    try {
      const lines = (remaining + data.toString()).split('\n');
      const newRemaining = lines.pop() || '';
      this.updateBuffer(stream, this.sanitizeOutput(newRemaining));
      lines.forEach((line) => {
        this.processLine(this.sanitizeOutput(line), stream);
        this.processedLines++;
      });
    } catch (error) {
      this.clearBuffer(stream);
      throw error;
    }
  }

  private sanitizeOutput(data: string): string {
    return (
      data
        // Remove all control chars except \n, \t, and ANSI escape sequences
        .replace(/[\x00-\x08\x0B-\x1A\x1C-\x1F\x7F-\x9F]/g, '')
        // Remove Unicode control characters
        .replace(/[\u0080-\u009F\u2000-\u200F\u2028-\u202F]/g, '')
    );
  }

  private updateBuffer(stream: Stream, newRemaining: string): void {
    if (stream === Stream.STDOUT) {
      this.stdoutRemaining = newRemaining;
    } else {
      this.stderrRemaining = newRemaining;
    }
  }

  private clearBuffer(stream: Stream): void {
    if (stream === Stream.STDOUT) {
      this.stdoutRemaining = '';
    } else {
      this.stderrRemaining = '';
    }
  }

  private processLine(line: string, stream: Stream): void {
    this.statsTracker.recordLine(stream);
    const result = this.filterManager.shouldFilter(line, stream);

    if (result.filtered && result.patternName) {
      this.statsTracker.recordFilter(stream, result.patternName, line);
    } else {
      process[stream].write(line + '\n');
    }
  }
}
