import { readFileSync } from 'fs';
import { resolve } from 'path';
import { FilterPattern, CompiledFilterPattern, CompiledRegexes, Stream } from './types';

export class FilterManager {
  constructor(private patterns: CompiledFilterPattern[], private compiledRegexes: CompiledRegexes) {}

  shouldFilter(line: string, stream: Stream): { filtered: boolean; patternName?: string } {
    const regex = this.compiledRegexes[stream];
    if (!regex?.test(line)) return { filtered: false };

    for (const pattern of this.patterns) {
      if (pattern.streams.includes(stream) && pattern.pattern.test(line)) {
        return { filtered: true, patternName: pattern.name };
      }
    }
    return { filtered: false };
  }

  static fromFile(patternsFile: string): FilterManager {
    const patternsPath = resolve(patternsFile);
    let patternsData: FilterPattern[];

    try {
      patternsData = JSON.parse(readFileSync(patternsPath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to read patterns file: ${(error as Error).message}`);
    }

    if (!Array.isArray(patternsData)) {
      throw new Error('Patterns file must contain an array');
    }

    const patterns = patternsData.map((p, index) => {
      if (!p.name || !p.pattern || !Array.isArray(p.streams)) {
        throw new Error(`Invalid pattern at index ${index}: missing name, pattern, or streams`);
      }

      try {
        return {
          ...p,
          pattern: new RegExp(p.pattern),
        };
      } catch (error) {
        throw new Error(`Invalid regex pattern "${p.pattern}" at index ${index}: ${(error as Error).message}`);
      }
    });

    const compiledRegexes = this.compilePatterns(patternsData);
    return new FilterManager(patterns, compiledRegexes);
  }

  private static compilePatterns(patterns: FilterPattern[]): CompiledRegexes {
    const stdoutPatterns = patterns.filter((p) => p.streams.includes(Stream.STDOUT)).map((p) => `(${p.pattern})`);
    const stderrPatterns = patterns.filter((p) => p.streams.includes(Stream.STDERR)).map((p) => `(${p.pattern})`);

    return {
      stdout: stdoutPatterns.length > 0 ? new RegExp(stdoutPatterns.join('|')) : null,
      stderr: stderrPatterns.length > 0 ? new RegExp(stderrPatterns.join('|')) : null,
    };
  }
}
