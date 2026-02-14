import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';

export class CommandRunner {
  private static readonly PROCESS_TIMEOUT_MS = 300000; // 5 minutes

  static validateCommand(command: string): void {
    try {
      execSync(`command -v ${command}`, { stdio: 'ignore' });
    } catch {
      console.error(`Error: Command '${command}' not found`);
      process.exit(1);
    }
  }

  static spawn(command: string, args: string[]): ChildProcess {
    // Validate command format (no shell metacharacters)
    if (!/^[\w-]+$/.test(command)) {
      throw new Error('Invalid command format');
    }

    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    // Add timeout handler
    const timeout = setTimeout(() => {
      child.kill();
      throw new Error(`Process timed out after ${CommandRunner.PROCESS_TIMEOUT_MS / 1000} seconds`);
    }, CommandRunner.PROCESS_TIMEOUT_MS);

    child.on('close', () => clearTimeout(timeout));

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      if ((err as any).code === 'ENOENT') {
        console.error(`Error: Command '${command}' not found`);
      } else {
        console.error(`Failed to start process: ${err.message}`);
      }
      process.exit(1);
    });

    return child;
  }
}
