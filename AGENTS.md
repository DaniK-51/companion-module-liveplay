# AI Agent Guide for LivePlay Companion Module Development

## Basic Rules for AI Development

### 1. Code Quality Standards
- **TypeScript Required**: Use TypeScript for all module development
- **Type Safety**: Define proper interfaces and types for all data structures
- **Error Handling**: Implement comprehensive error handling with proper logging
- **Async/Await**: Use async/await for all asynchronous operations
- **Clean Code**: Follow consistent formatting and naming conventions

### 2. Companion Module Architecture
- **Instance Pattern**: Extend `InstanceBase<ModuleSchema>` for the main module class
- **Configuration**: Use `SomeCompanionConfigField[]` for configuration options
- **Actions**: Define actions with proper options and callback functions
- **Feedbacks**: Create boolean feedbacks with appropriate styling
- **Variables**: Expose variables for real-time data updates

### 3. API Integration Best Practices
- **Connection Management**: Implement proper connection handling with retries
- **WebSocket Handling**: Use proper WebSocket connection lifecycle management
- **Rate Limiting**: Implement appropriate rate limiting for API calls
- **Caching**: Cache frequently accessed data to reduce API calls
- **State Synchronization**: Keep local state synchronized with server state

### 4. Performance Considerations
- **Debouncing**: Debounce rapid updates to prevent performance issues
- **Memory Management**: Clean up resources properly in destroy() method
- **Update Frequency**: Limit update frequency for real-time data
- **Batch Operations**: Group multiple operations when possible

## Specific Rules for LivePlay Companion Module

### 1. LivePlay API Integration
```typescript
// Always use proper typing for LivePlay API responses
interface LivePlayCue {
  id: string;
  display_name: string;
  file_path: string;
  artist: string;
  title: string;
  duration_sec: number;
  gain_db: number;
  transport: number; // 0=Stopped, 1=Playing, 2=FadingOut, 3=Paused
}

// Implement proper error handling for API calls
async function loadCue(cueId: string): Promise<LivePlayCue | null> {
  try {
    const response = await fetch(`http://${this.config.host}:${this.config.port}/api/cues/${cueId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    this.log('error', `Failed to load cue ${cueId}: ${error.message}`);
    return null;
  }
}
```

### 2. WebSocket Connection Management
```typescript
// Implement proper WebSocket lifecycle
class LivePlayWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private instance: ModuleInstance) {}

  connect() {
    this.ws = new WebSocket(`ws://${this.instance.config.host}:${this.instance.config.port}/ws`);
    
    this.ws.onopen = () => {
      this.instance.log('info', 'WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      this.instance.log('warn', 'WebSocket disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      this.instance.log('error', 'WebSocket error');
    };
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }
}
```

### 3. Action Implementation Pattern
```typescript
// Always use proper typing for action options
interface PlayCueActionOptions {
  cueId: string;
  useUuid: boolean;
  fadeTime: number;
}

export function updateActions(self: ModuleInstance): void {
  self.setActionDefinitions({
    play_cue: {
      name: 'Play Cue',
      options: [
        {
          id: 'cueId',
          type: 'textinput',
          label: 'Cue ID',
          default: '',
        },
        {
          id: 'useUuid',
          type: 'checkbox',
          label: 'Use UUID instead of Cue ID',
          default: true,
        },
        {
          id: 'fadeTime',
          type: 'number',
          label: 'Fade Time (ms)',
          default: 0,
          min: 0,
          max: 10000,
        },
      ],
      callback: async (event) => {
        try {
          const options = event.options as PlayCueActionOptions;
          const endpoint = options.useUuid ? 'item_uuid' : 'cue_id';
          await fetch(`http://${self.config.host}:${self.config.port}/api/project/items/${options.cueId}/play`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fade_ms: options.fadeTime,
            }),
          });
        } catch (error) {
          self.log('error', `Failed to play cue: ${error.message}`);
        }
      },
    },
  });
}
```

### 4. Feedback Implementation Pattern
```typescript
// Always use proper typing for feedback options
interface CueFeedbackOptions {
  cueId: string;
  useUuid: boolean;
}

export function updateFeedbacks(self: ModuleInstance): void {
  self.setFeedbackDefinitions({
    cue_is_playing: {
      name: 'Cue Is Playing',
      type: 'boolean',
      defaultStyle: {
        bgcolor: 0x00ff00,
        color: 0x000000,
      },
      options: [
        {
          id: 'cueId',
          type: 'textinput',
          label: 'Cue ID',
          default: '',
        },
        {
          id: 'useUuid',
          type: 'checkbox',
          label: 'Use UUID instead of Cue ID',
          default: true,
        },
      ],
      callback: (feedback) => {
        const options = feedback.options as CueFeedbackOptions;
        // Check if cue is currently playing
        return self.playingCues.has(options.cueId);
      },
    },
  });
}
```

### 5. Variable Implementation Pattern
```typescript
// Always use proper typing for variables
interface PlayerVariables {
  state: string;
  position: number;
  duration: number;
  progress: number;
}

export function updateVariableDefinitions(self: ModuleInstance): void {
  self.setVariableDefinitions({
    player_state: { 
      name: 'Player State' 
    },
    player_position: { 
      name: 'Player Position (seconds)' 
    },
    player_duration: { 
      name: 'Player Duration (seconds)' 
    },
    player_progress: { 
      name: 'Player Progress (%)' 
    },
  });
}

export function updateVariables(self: ModuleInstance): void {
  const state = self.playerState;
  self.setVariableValues({
    player_state: state.state,
    player_position: state.position,
    player_duration: state.duration,
    player_progress: state.progress,
  });
}
```

### 6. Configuration Pattern
```typescript
// Always use proper typing for configuration
interface ModuleConfig {
  host: string;
  port: number;
  connectionTimeout: number;
  debugLogging: boolean;
  updateInterval: number;
}

export function getConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      type: 'textinput',
      id: 'host',
      label: 'LivePlay Server IP',
      default: '127.0.0.1',
      width: 8,
    },
    {
      type: 'number',
      id: 'port',
      label: 'Port',
      default: 4480,
      min: 1,
      max: 65535,
      width: 4,
    },
    {
      type: 'number',
      id: 'connectionTimeout',
      label: 'Connection Timeout (ms)',
      default: 5000,
      min: 1000,
      max: 30000,
      width: 6,
    },
    {
      type: 'checkbox',
      id: 'debugLogging',
      label: 'Debug Logging',
      default: false,
      width: 6,
    },
    {
      type: 'number',
      id: 'updateInterval',
      label: 'Update Interval (ms)',
      default: 100,
      min: 50,
      max: 1000,
      width: 6,
    },
  ];
}
```

## Conventional Commit Policy

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scopes
- **main**: Changes to the main module class
- **config**: Configuration-related changes
- **actions**: Action definitions and implementations
- **feedbacks**: Feedback definitions and implementations
- **variables**: Variable definitions and implementations
- **presets**: Preset definitions and implementations
- **api**: API client and WebSocket handling
- **types**: Type definitions and interfaces
- **docs**: Documentation changes
- **build**: Build configuration and scripts

### Examples
```
feat(actions): add play cue action with UUID support

This commit adds a new action to play cues by UUID or cue ID.
The action supports fade time configuration and proper error handling.

fix(api): handle WebSocket connection timeouts properly

- Added exponential backoff for reconnection attempts
- Improved error logging for connection failures
- Added proper cleanup on module destruction

docs(help): update installation instructions

- Added troubleshooting section
- Updated setup steps for LivePlay server
- Added example configurations

refactor(variables): improve variable update performance

- Debounced rapid updates to prevent performance issues
- Added caching for frequently accessed data
- Optimized variable update logic

perf(feedbacks): reduce feedback update frequency

- Implemented proper debouncing for feedback updates
- Added rate limiting for real-time data
- Optimized feedback callback execution
```

### Commit Message Guidelines
1. **Use the imperative mood** ("add feature" not "added feature")
2. **Keep messages concise** but descriptive
3. **Include scope** for all non-trivial changes
4. **Break large changes** into multiple logical commits
5. **Reference issues** in the body when applicable
6. **Test thoroughly** before committing
7. **Run linting** to ensure code quality
8. **Update documentation** when adding new features

### Branch Naming Convention
- **feature/**: For new features (e.g., `feature/cart-system`)
- **fix/**: For bug fixes (e.g., `fix/connection-timeout`)
- **docs/**: For documentation changes (e.g., `docs/api-reference`)
- **refactor/**: For refactoring (e.g., `refactor/variable-system`)
- **hotfix/**: For emergency fixes (e.g., `hotfix/security-patch`)

## Build Process: Transforming Source Code (src) into the Final Bundle

The `src` directory contains human-readable code, strict typing, and tests. When running build commands (e.g., `npm run package`), a multi-stage transformation occurs to create a compact production package:

1. **TypeScript Compilation**: All type annotations, interfaces, and generics are stripped out. Test files and mocks are physically excluded from the build via `tsconfig.build.json`.
2. **Bundling & Tree Shaking**: The bundler builds a single dependency graph. Any unused code (dead code) and unused parts of third-party libraries are automatically dropped.
3. **Minification**: Identifiers are renamed to short names, and whitespace, newlines, and comments are removed.
4. **External Dependencies**: Core host environment dependencies (e.g., `@companion-module/base`) are not bundled into the final file; instead, they are resolved from the runtime environment.

> **Context for AI Agents:** Due to tree shaking and minification, the structure, sizes, and names in the compiled `dist` folder can differ radically from `src`. When analyzing business logic, debugging, or refactoring, **always rely exclusively on the source code in `src`**, ignoring the generated bundle.
