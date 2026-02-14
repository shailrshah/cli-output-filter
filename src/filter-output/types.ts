export enum Stream {
  STDOUT = 'stdout',
  STDERR = 'stderr',
}

export interface FilterPattern {
  name: string;
  pattern: string;
  streams: ('stdout' | 'stderr')[];
}

export interface CompiledFilterPattern {
  name: string;
  pattern: RegExp;
  streams: ('stdout' | 'stderr')[];
}

export interface CompiledRegexes {
  stdout: RegExp | null;
  stderr: RegExp | null;
}

export interface StreamStats {
  total: number;
  filtered: number;
  patterns: Record<string, number>;
  examples: Record<string, string | null>;
}

export interface Stats {
  stdout: StreamStats;
  stderr: StreamStats;
}

export interface PatternStat {
  name: string;
  count: number;
  stream: Stream;
  percentage: number;
  example: string | null;
}

export interface Summary {
  totalLines: number;
  totalFiltered: number;
  linesShown: number;
  filteredPercentage: number;
  patterns: PatternStat[];
}

export interface GeneratedSummary {
  totalLinesCount: number;
  totalLinesFilteredOutCount: number;
  linesShownCount: number;
  filteredPercentage: number;
  patterns: PatternStat[];
}
