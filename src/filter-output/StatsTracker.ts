import { CompiledFilterPattern, Stats, Stream, PatternStat, GeneratedSummary } from './types';

export class StatsTracker {
  private stats: Stats = {
    stdout: { total: 0, filtered: 0, patterns: {}, examples: {} },
    stderr: { total: 0, filtered: 0, patterns: {}, examples: {} },
  };

  constructor(patterns: CompiledFilterPattern[]) {
    patterns.forEach((p) => {
      p.streams.forEach((stream) => {
        this.stats[stream].patterns[p.name] = 0;
        this.stats[stream].examples[p.name] = null;
      });
    });
  }

  recordLine(stream: Stream): void {
    this.stats[stream].total++;
  }

  recordFilter(stream: Stream, patternName: string, line: string): void {
    this.stats[stream].filtered++;
    this.stats[stream].patterns[patternName]++;
    if (!this.stats[stream].examples[patternName]) {
      this.stats[stream].examples[patternName] = line;
    }
  }

  printSummary(): void {
    const summary = this.generateSummary();
    this.displaySummary(summary);
  }

  private generateSummary(): GeneratedSummary {
    const totalLinesFilteredOutCount = this.getTotalFilteredCount();
    const totalLinesCount = this.getTotalLinesCount();

    return {
      totalLinesCount,
      totalLinesFilteredOutCount,
      linesShownCount: totalLinesCount - totalLinesFilteredOutCount,
      filteredPercentage: this.calculatePercentage(totalLinesFilteredOutCount, totalLinesCount),
      patterns: this.generatePatternStats(totalLinesCount),
    };
  }

  private getTotalFilteredCount(): number {
    return this.stats.stdout.filtered + this.stats.stderr.filtered;
  }

  private getTotalLinesCount(): number {
    return this.stats.stdout.total + this.stats.stderr.total;
  }

  private calculatePercentage(part: number, total: number): number {
    return total > 0 ? parseFloat(((part / total) * 100).toFixed(1)) : 0;
  }

  private generatePatternStats(totalLinesCount: number): PatternStat[] {
    if (totalLinesCount === 0) return [];

    const patterns: PatternStat[] = [];

    ([Stream.STDOUT, Stream.STDERR] as const).forEach((stream) => {
      this.addStreamPatterns(stream, totalLinesCount, patterns);
    });

    return patterns.sort((a, b) => b.count - a.count);
  }

  private addStreamPatterns(stream: Stream, totalLinesCount: number, patterns: PatternStat[]): void {
    Object.entries(this.stats[stream].patterns)
      .filter(([, count]) => count > 0)
      .forEach(([name, linesFilteredOutCount]) => {
        patterns.push({
          name,
          count: linesFilteredOutCount,
          stream,
          percentage: this.calculatePercentage(linesFilteredOutCount, totalLinesCount),
          example: this.stats[stream].examples[name],
        });
      });
  }

  private displaySummary(summary: GeneratedSummary): void {
    console.log('\n=== Filter Summary ===');

    this.displayOverallStats(summary);
    console.log('');
    this.displayPatternStats(summary.patterns);
  }

  private displayOverallStats(summary: GeneratedSummary): void {
    console.log(`Total Lines: ${summary.totalLinesCount}`);
    console.log(`Filtered Out: ${summary.totalLinesFilteredOutCount}`);
    console.log(`Lines Shown: ${summary.linesShownCount}`);
    console.log(`Filtered Out Percentage: ${summary.filteredPercentage}%`);
  }

  private displayPatternStats(patterns: PatternStat[]): void {
    if (patterns.length > 0) {
      patterns.forEach((pattern) => {
        console.log(`Pattern: "${pattern.name}" (from ${pattern.stream})`);
        console.log(`  Lines Filtered Out: ${pattern.count} (${pattern.percentage}%)`);
        if (pattern.example) {
          console.log(`  Example: ${pattern.example}`);
        }
        console.log('');
      });
    } else {
      console.log('\nNo patterns matched any lines.');
    }
  }
}
