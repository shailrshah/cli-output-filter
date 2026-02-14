import { FilterManager } from '../filter-output/FilterManager';
import { Stream } from '../filter-output/types';
import { writeFileSync, unlinkSync } from 'fs';

describe('FilterManager', () => {
  const testFile = 'test-patterns.json';
  
  afterEach(() => {
    try { unlinkSync(testFile); } catch {}
  });

  test('shouldFilter returns false when no patterns match', () => {
    const manager = new FilterManager([], { stdout: null, stderr: null });
    expect(manager.shouldFilter('test line', Stream.STDOUT)).toEqual({ filtered: false });
  });

  test('fromFile loads patterns correctly', () => {
    const patterns = [{ name: 'test', pattern: 'error', streams: ['stdout'] }];
    writeFileSync(testFile, JSON.stringify(patterns));
    
    const manager = FilterManager.fromFile(testFile);
    expect(manager.shouldFilter('error message', Stream.STDOUT)).toEqual({ 
      filtered: true, 
      patternName: 'test' 
    });
  });

  test('fromFile throws on invalid JSON', () => {
    writeFileSync(testFile, 'invalid json');
    expect(() => FilterManager.fromFile(testFile)).toThrow();
  });

  test('fromFile throws on non-array data', () => {
    writeFileSync(testFile, '{}');
    expect(() => FilterManager.fromFile(testFile)).toThrow('Patterns file must contain an array');
  });

  test('fromFile throws on invalid pattern structure', () => {
    writeFileSync(testFile, '[{"name": "test"}]');
    expect(() => FilterManager.fromFile(testFile)).toThrow('Invalid pattern at index 0');
  });

  test('fromFile throws on invalid regex', () => {
    const patterns = [{ name: 'test', pattern: '[invalid', streams: ['stdout'] }];
    writeFileSync(testFile, JSON.stringify(patterns));
    expect(() => FilterManager.fromFile(testFile)).toThrow('Invalid regex pattern');
  });
});
