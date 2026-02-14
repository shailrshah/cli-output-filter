#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { FilterManager } from './filter-output/FilterManager';
import { StatsTracker } from './filter-output/StatsTracker';
import { StreamProcessor } from './filter-output/StreamProcessor';
import { CommandRunner } from './filter-output/CommandRunner';
import { FilterPattern, Stream } from './filter-output/types';

// Main execution
const [, , ...allArgs] = process.argv;

if (allArgs.length === 0) {
  console.error('Usage: filter-output [--patterns <file>] <command> [args...]');
  console.error('  --patterns <file>  JSON file containing filter patterns (optional)');
  process.exit(1);
}

// Parse arguments
let patternsFile: string | null = null;
let commandArgs = allArgs;

if (allArgs[0] === '--patterns' && allArgs.length > 2) {
  patternsFile = allArgs[1];
  commandArgs = allArgs.slice(2);
}

// Initialize components
let filterManager: FilterManager;
let statsTracker: StatsTracker;

if (patternsFile) {
  try {
    filterManager = FilterManager.fromFile(patternsFile);
    // Parse patterns for stats tracker
    const patternsPath = resolve(patternsFile);
    const patternsData: FilterPattern[] = JSON.parse(readFileSync(patternsPath, 'utf8'));
    const compiledPatterns = patternsData.map((p) => ({ ...p, pattern: new RegExp(p.pattern) }));
    statsTracker = new StatsTracker(compiledPatterns);
  } catch (error) {
    console.error(`Error loading patterns file: ${(error as Error).message}`);
    process.exit(1);
  }
} else {
  filterManager = new FilterManager([], { stdout: null, stderr: null });
  statsTracker = new StatsTracker([]);
}

const streamProcessor = new StreamProcessor(filterManager, statsTracker);

const [command, ...commandArgsRest] = commandArgs;

// Validate and spawn command
CommandRunner.validateCommand(command);
const child = CommandRunner.spawn(command, commandArgsRest);

// Process streams
child.stdout?.on('data', (data: Buffer) => {
  streamProcessor.processData(data, Stream.STDOUT);
});

child.stderr?.on('data', (data: Buffer) => {
  streamProcessor.processData(data, Stream.STDERR);
});

// Handle process completion
child.on('close', (code: number | null, signal: string | null) => {
  statsTracker.printSummary();
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code || 0);
  }
});

// Forward signals to child process
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => {
    child.kill(signal as NodeJS.Signals);
  });
});
