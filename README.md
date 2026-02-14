# cli-output-filter

A CLI tool for filtering repetitive output from commands while preserving important information and providing statistics on what was filtered.

## Installation

```bash
npm install -g cli-output-filter
```

## Usage

### Basic Usage

```bash
# Filter output from any command
filter-output --patterns patterns.json <command> [args...]

# Example: Filter CDK synth output
filter-output --patterns patterns.json cdk synth

# Example: Filter build output
filter-output --patterns patterns.json npm run build
```

### Pattern File Format

Create a JSON file with filter patterns:

```json
[
  {
    "name": "debug-messages",
    "pattern": "^DEBUG:",
    "streams": ["stdout", "stderr"]
  },
  {
    "name": "info-messages",
    "pattern": "^INFO:",
    "streams": ["stdout"]
  }
]
```

**Fields:**
- `name` - Identifier for the pattern (used in statistics)
- `pattern` - Regular expression to match lines
- `streams` - Array of streams to filter: `["stdout"]`, `["stderr"]`, or `["stdout", "stderr"]`

### Output

The tool shows filtered command output in real-time and provides a summary at the end:

```
=== Filter Summary ===
Total Lines: 1000
Filtered Out: 850
Lines Shown: 150
Filtered Out Percentage: 85%

Pattern: "debug-messages" (from stdout)
  Lines Filtered Out: 500 (50%)
  Example: DEBUG: Initializing component...

Pattern: "info-messages" (from stdout)
  Lines Filtered Out: 350 (35%)
  Example: INFO: Processing request...
```

## Use Cases

- **Build Output**: Remove verbose logging while keeping errors
- **Test Output**: Hide passing test details, show only failures
- **CI/CD Logs**: Reduce log volume while preserving important information
- **Development**: Filter repetitive warnings and deprecation notices

## Features

- ✅ Real-time filtering (no buffering)
- ✅ Preserves command exit codes
- ✅ Handles both stdout and stderr
- ✅ Provides detailed statistics
- ✅ Shows example of each filtered pattern
- ✅ Regex pattern matching
- ✅ Signal forwarding (SIGINT, SIGTERM, SIGQUIT)

## Requirements

- Node.js >= 20

## License

MIT
