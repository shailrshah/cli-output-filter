import { CommandRunner } from '../filter-output/CommandRunner';
import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';

jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('CommandRunner', () => {
  let mockExit: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    jest.clearAllMocks();
  });

  test('validateCommand exits on invalid command', () => {
    mockExecSync.mockImplementation(() => { throw new Error(); });
    
    CommandRunner.validateCommand('nonexistentcommand123');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('spawn throws on invalid command format', () => {
    expect(() => CommandRunner.spawn('invalid;command', [])).toThrow('Invalid command format');
  });

  test('spawn handles child process error', () => {
    const mockChild = new EventEmitter() as any;
    mockSpawn.mockReturnValue(mockChild);

    CommandRunner.spawn('echo', ['test']);
    
    mockChild.emit('error', { code: 'ENOENT' });
    expect(mockConsoleError).toHaveBeenCalledWith("Error: Command 'echo' not found");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('spawn handles generic error', () => {
    const mockChild = new EventEmitter() as any;
    mockSpawn.mockReturnValue(mockChild);

    CommandRunner.spawn('echo', ['test']);
    
    mockChild.emit('error', new Error('Generic error'));
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to start process: Generic error');
  });

  test('spawn clears timeout on close', () => {
    const mockChild = new EventEmitter() as any;
    mockSpawn.mockReturnValue(mockChild);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    CommandRunner.spawn('echo', ['test']);
    mockChild.emit('close');
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
