import { StatsTracker } from '../filter-output/StatsTracker';
import { Stream } from '../filter-output/types';

describe('StatsTracker', () => {
  test('recordLine increments total count', () => {
    const tracker = new StatsTracker([]);
    tracker.recordLine(Stream.STDOUT);
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Total Lines: 1');
    mockConsoleLog.mockRestore();
  });

  test('recordFilter increments filtered count', () => {
    const patterns = [{ name: 'test', pattern: /error/, streams: ['stdout'] as ('stdout' | 'stderr')[] }];
    const tracker = new StatsTracker(patterns);
    
    tracker.recordLine(Stream.STDOUT);
    tracker.recordFilter(Stream.STDOUT, 'test', 'error line');
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Filtered Out: 1');
    mockConsoleLog.mockRestore();
  });

  test('printSummary shows pattern details', () => {
    const patterns = [{ name: 'test', pattern: /error/, streams: ['stdout'] as ('stdout' | 'stderr')[] }];
    const tracker = new StatsTracker(patterns);
    
    tracker.recordLine(Stream.STDOUT);
    tracker.recordFilter(Stream.STDOUT, 'test', 'error example');
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Pattern: "test" (from stdout)');
    expect(mockConsoleLog).toHaveBeenCalledWith('  Example: error example');
    mockConsoleLog.mockRestore();
  });

  test('printSummary handles no patterns', () => {
    const tracker = new StatsTracker([]);
    tracker.recordLine(Stream.STDOUT);
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('\nNo patterns matched any lines.');
    mockConsoleLog.mockRestore();
  });

  test('calculatePercentage handles zero total', () => {
    const tracker = new StatsTracker([]);
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary(); // No lines recorded, total = 0
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Filtered Out Percentage: 0%');
    mockConsoleLog.mockRestore();
  });

  test('handles stderr patterns', () => {
    const patterns = [{ name: 'stderr-test', pattern: /error/, streams: ['stderr'] as ('stdout' | 'stderr')[] }];
    const tracker = new StatsTracker(patterns);
    
    tracker.recordLine(Stream.STDERR);
    tracker.recordFilter(Stream.STDERR, 'stderr-test', 'stderr error');
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Pattern: "stderr-test" (from stderr)');
    mockConsoleLog.mockRestore();
  });

  test('handles mixed stdout and stderr patterns', () => {
    const patterns = [
      { name: 'stdout-pattern', pattern: /info/, streams: ['stdout'] as ('stdout' | 'stderr')[] },
      { name: 'stderr-pattern', pattern: /error/, streams: ['stderr'] as ('stdout' | 'stderr')[] }
    ];
    const tracker = new StatsTracker(patterns);
    
    tracker.recordLine(Stream.STDOUT);
    tracker.recordLine(Stream.STDERR);
    tracker.recordFilter(Stream.STDOUT, 'stdout-pattern', 'info message');
    tracker.recordFilter(Stream.STDERR, 'stderr-pattern', 'error message');
    
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    tracker.printSummary();
    
    expect(mockConsoleLog).toHaveBeenCalledWith('Pattern: "stdout-pattern" (from stdout)');
    expect(mockConsoleLog).toHaveBeenCalledWith('Pattern: "stderr-pattern" (from stderr)');
    mockConsoleLog.mockRestore();
  });
});
