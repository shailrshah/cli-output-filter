import { StreamProcessor } from '../filter-output/StreamProcessor';
import { FilterManager } from '../filter-output/FilterManager';
import { StatsTracker } from '../filter-output/StatsTracker';
import { Stream } from '../filter-output/types';

describe('StreamProcessor', () => {
  let processor: StreamProcessor;
  let mockFilterManager: jest.Mocked<FilterManager>;
  let mockStatsTracker: jest.Mocked<StatsTracker>;

  beforeEach(() => {
    mockFilterManager = {
      shouldFilter: jest.fn().mockReturnValue({ filtered: false })
    } as any;
    mockStatsTracker = {
      recordLine: jest.fn(),
      recordFilter: jest.fn()
    } as any;
    processor = new StreamProcessor(mockFilterManager, mockStatsTracker);
  });

  test('processData handles single line', () => {
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    
    processor.processData(Buffer.from('test line\n'), Stream.STDOUT);
    
    expect(mockStatsTracker.recordLine).toHaveBeenCalledWith(Stream.STDOUT);
    expect(mockWrite).toHaveBeenCalledWith('test line\n');
    
    mockWrite.mockRestore();
  });

  test('processData filters matching lines', () => {
    mockFilterManager.shouldFilter.mockReturnValue({ filtered: true, patternName: 'test' });
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    
    processor.processData(Buffer.from('error line\n'), Stream.STDOUT);
    
    expect(mockStatsTracker.recordFilter).toHaveBeenCalledWith(Stream.STDOUT, 'test', 'error line');
    expect(mockWrite).not.toHaveBeenCalled();
    
    mockWrite.mockRestore();
  });

  test('processData handles partial lines', () => {
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    
    processor.processData(Buffer.from('partial'), Stream.STDOUT);
    processor.processData(Buffer.from(' line\n'), Stream.STDOUT);
    
    expect(mockStatsTracker.recordLine).toHaveBeenCalledWith(Stream.STDOUT);
    expect(mockWrite).toHaveBeenCalledWith('partial line\n');
    
    mockWrite.mockRestore();
  });

  test('processData throws on buffer size exceeded', () => {
    const largeBuffer = Buffer.alloc(1024 * 600); // Exceeds 512KB limit
    expect(() => processor.processData(largeBuffer, Stream.STDOUT)).toThrow('Buffer size exceeded');
  });

  test('processData handles stderr stream', () => {
    const mockWrite = jest.spyOn(process.stderr, 'write').mockImplementation();
    
    processor.processData(Buffer.from('stderr line\n'), Stream.STDERR);
    
    expect(mockStatsTracker.recordLine).toHaveBeenCalledWith(Stream.STDERR);
    expect(mockWrite).toHaveBeenCalledWith('stderr line\n');
    
    mockWrite.mockRestore();
  });

  test('processData handles data with control characters', () => {
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    
    // Test ANSI escape sequences are preserved
    processor.processData(Buffer.from('\x1b[31mred text\x1b[0m\n'), Stream.STDOUT);
    
    expect(mockWrite).toHaveBeenCalledWith('\x1b[31mred text\x1b[0m\n');
    mockWrite.mockRestore();
  });

  test('processData resets rate limit counter after time interval', () => {
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    const originalDateNow = Date.now;
    let currentTime = 1000;
    Date.now = jest.fn(() => currentTime);
    
    // Process a line
    processor.processData(Buffer.from('line1\n'), Stream.STDOUT);
    
    // Advance time beyond reset interval
    currentTime = 2001;
    
    // This should trigger the rate limit reset logic
    processor.processData(Buffer.from('line2\n'), Stream.STDOUT);
    
    Date.now = originalDateNow;
    mockWrite.mockRestore();
  });

  test('processData handles error in processing', () => {
    mockFilterManager.shouldFilter.mockImplementation(() => {
      throw new Error('Filter error');
    });
    
    expect(() => processor.processData(Buffer.from('test\n'), Stream.STDOUT)).toThrow('Filter error');
  });

  test('processData clears buffer on error', () => {
    const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
    
    // First add some data to buffer
    processor.processData(Buffer.from('partial'), Stream.STDOUT);
    
    // Then cause an error with oversized buffer
    const largeBuffer = Buffer.alloc(1024 * 600);
    expect(() => processor.processData(largeBuffer, Stream.STDOUT)).toThrow();
    
    // Buffer should be cleared, so this should work
    processor.processData(Buffer.from('new line\n'), Stream.STDOUT);
    expect(mockWrite).toHaveBeenCalledWith('new line\n');
    
    mockWrite.mockRestore();
  });
});
