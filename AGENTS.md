# AI Agent Guide for LivePlay Companion Module Development

## Critical Pitfalls (Lessons Learned)

### 1. NEVER Re-register Feedback/Action/Variable Definitions in Update Loop

**WRONG** — causes infinite loop and Companion UI freeze:

```typescript
private startUpdateLoop(): void {
    const update = () => {
        UpdateVariables(this)
        this.updateFeedbacks()  // ❌ re-registers definitions every 100ms
    }
    this.updateIntervalId = setInterval(update, this.config.updateInterval)
}
```

**CORRECT** — register definitions once in `init()`, use `checkFeedbacks()` in update loop:

```typescript
async init(config: ModuleConfig): Promise<void> {
    // Register definitions ONCE
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()
    this.updateVariableDefinitions()

    this.startUpdateLoop()
}

private startUpdateLoop(): void {
    const update = () => {
        UpdateVariables(this)
        this.checkFeedbacks('feedback_type_1', 'feedback_type_2')  // ✅ re-evaluate only
    }
    this.updateIntervalId = setInterval(update, this.config.updateInterval)
}
```

### 2. Health Check Before WebSocket Connection

**WRONG** — shows "Ok" before actually connecting:

```typescript
async init(config: ModuleConfig): Promise<void> {
    this.webSocketClient.connect()
    this.updateStatus(InstanceStatus.Ok)  // ❌ premature
}
```

**CORRECT** — check health first, then connect:

```typescript
async init(config: ModuleConfig): Promise<void> {
    this.updateStatus(InstanceStatus.Connecting)
    void this.connectWithHealthCheck()
}

private async connectWithHealthCheck(): Promise<void> {
    const isHealthy = await this.apiClient.checkHealth()
    if (isHealthy) {
        this.webSocketClient.connect()
    } else {
        this.updateStatus(InstanceStatus.ConnectionFailure)
    }
}
```

### 3. WebSocket Client Must Match LivePlay Frontend Pattern

- Check `readyState === OPEN || CONNECTING` before creating new connection
- Use exponential backoff (1.5s → 3s → 6s → 10s max)
- Clear handlers on intentional disconnect to prevent reconnect
- Log connection URL for debugging

### 4. `checkFeedbacks()` Requires At Least One Argument

```typescript
// ❌ Wrong — TypeScript error
this.checkFeedbacks()

// ✅ Correct — pass all feedback type IDs
this.checkFeedbacks(
	'connection_status',
	'any_cue_playing',
	'cue_is_playing',
	// ...
)
```

### 5. `pkg/` Directory Permission Issues on Windows/WSL

If `yarn package` fails with `EACCES: permission denied, rmdir 'pkg/liveplay'`:

```bash
cmd.exe /c "rmdir /s /q C:\\Users\\DaniK\\companion_modules\\companion-module-liveplay\\pkg\\liveplay"
yarn package
```

## Project Architecture

### State Management

The module maintains several Maps for O(1) lookup:

| Map            | Key       | Value          | Purpose                           |
| -------------- | --------- | -------------- | --------------------------------- |
| `projectItems` | uuid      | ProjectItem    | Flat lookup for all project items |
| `engineCues`   | cue_id    | EngineCue      | Engine-level cue metadata         |
| `uuidToCueId`  | item_uuid | cue_id         | Cross-reference: project → engine |
| `cueIdToUuid`  | cue_id    | item_uuid      | Cross-reference: engine → project |
| `cueStates`    | cue_id    | TransportState | Real-time transport state         |
| `cuePositions` | cue_id    | number         | Real-time playhead position       |

### Data Flow

```
LivePlay Server
    ├── WebSocket (ws://host:4480/ws)
    │   ├── playback_snapshot (on connect) → updates all Maps
    │   ├── cue_state (on transport change) → updates cueStates/cuePositions
    │   ├── meters (~60Hz) → updates meter Maps
    │   ├── doc_patch (on mutation) → incremental state updates
    │   └── set_selection (on UI click) → updates selectedItemUuid
    │
    └── REST API (http://host:4480)
        ├── GET /api/health → connection check
        ├── GET /api/project → full project document
        ├── GET /api/cues → engine cue list
        ├── GET /api/mixers → mixer channels
        └── GET /api/devices → audio devices
```

### doc_patch Operations

| Op                    | Fields                        | Action                                |
| --------------------- | ----------------------------- | ------------------------------------- |
| `project_changed`     | (none)                        | Full reload via `loadProjectState()`  |
| `item_added`          | uuid, parentUuid, item, cueId | Add to projectItems + tree            |
| `item_updated`        | uuid, patch                   | Merge patch into existing item        |
| `item_removed`        | uuid                          | Remove from projectItems + tree       |
| `items_reordered`     | parentUuid, uuids[]           | Reorder children, recalculate indices |
| `cart_slot_set`       | slot, itemUuid                | Update cartSlots                      |
| `cart_slot_cleared`   | slot                          | Remove from cartSlots                 |
| `selection_changed`   | itemUuid                      | Update selectedItemUuid               |
| `master_gain_changed` | db                            | Update masterGainDb                   |
| `next_item_set`       | itemUuid                      | Update nextItemUuid                   |
| `preview_started`     | itemUuid, cueId               | Update previewItemUuid/previewCueId   |
| `preview_stopped`     | (none)                        | Clear preview state                   |

### Selection Tracking

Selection is tracked via two sources:

1. `playback_snapshot.selected_item_uuid` — sent on connect/reconnect
2. `doc_patch { op: "selection_changed" }` — sent on every UI click

**DO NOT** add selection to meters frame — it's unnecessary (selection changes infrequently, meters at 60Hz).

## LivePlay API Reference

### Transport States

- `0` = Stopped
- `1` = Playing
- `2` = FadingOut
- `3` = Paused

### Key Endpoints

- `GET /api/health` → `{ ok: true, name: "liveplay-server" }`
- `GET /api/project` → full project document with items tree
- `GET /api/cues` → array of engine cues with metadata
- `GET /api/selection` → `{ itemUuid: "..." }` current selection
- `POST /api/selection` → `{ itemUuid: "..." }` or `{ delta: -1|1 }`

### WebSocket Frames (Client → Server)

- `play`, `stop`, `pause`, `resume` — transport control
- `seek` — set playhead position
- `gain`, `fade` — per-cue audio settings
- `stop_all` — stop all cues
- `set_selection` — set UI selection
- `set_next_item` — set "Up Next" target

## Companion Module Patterns

### Action Options with Lookup Modes

Use dropdown for lookup mode:

```typescript
const cueOptions = [
	{
		id: 'lookupMode',
		type: 'dropdown',
		choices: [
			{ id: 'uuid', label: 'By UUID' },
			{ id: 'cue_id', label: 'By Engine Cue ID' },
			{ id: 'index', label: 'By Index (e.g. 0, 1,3)' },
			{ id: 'selected', label: 'Selected in LivePlay' },
		],
	},
	{ id: 'cueId', type: 'textinput', useVariables: true },
]
```

### Mode System

Three mutually exclusive modes control button behavior:

| Mode    | Property      | Variable       | Behavior                      |
| ------- | ------------- | -------------- | ----------------------------- |
| No-Play | `noPlayMode`  | `no_play_mode` | Assign/unassign only          |
| Preview | `previewMode` | `preview_mode` | Pre-listen via preview device |
| Next    | `nextMode`    | `next_mode`    | Set as "Up Next" target       |

Toggle actions: `toggle_no_play`, `toggle_preview_mode`, `toggle_next_mode`

### Layered Presets with Expressions

For buttons that need expression-driven text, use layered presets:

```typescript
presets['my_preset'] = {
    type: 'layered',
    name: 'My Preset',
    elements: [
        {
            type: 'box',
            id: 'bg',
            x: { isExpression: false, value: 0 },
            y: { isExpression: false, value: 0 },
            width: { isExpression: false, value: 100 },
            height: { isExpression: false, value: 100 },
            color: { isExpression: false, value: 0x333333 },
        },
        {
            type: 'text',
            id: 'label',
            x: { isExpression: false, value: 0 },
            y: { isExpression: false, value: 0 },
            width: { isExpression: false, value: 100 },
            height: { isExpression: false, value: 100 },
            text: { isExpression: true, value: '$(liveplay:some_var) == "" ? "Default" : $(liveplay:some_var)' },
            color: { isExpression: false, value: 0xffffff },
            fontsize: { isExpression: false, value: 38 },
            halign: { isExpression: false, value: 'center' },
            valign: { isExpression: false, value: 'center' },
        },
    ],
    steps: [...],
    feedbacks: [
        {
            feedbackId: 'my_feedback',
            options: {},
            styleOverrides: [
                { elementId: 'bg', elementProperty: 'color', override: { isExpression: false, value: 0x00ff00 } },
                { elementId: 'label', elementProperty: 'text', override: { isExpression: true, value: '...' } },
            ],
        },
    ],
}
```

**Note:** `style.text` in simple presets only supports plain strings (variables work, expressions don't). Use layered presets for expression-driven text.

### Index-Based Navigation

Index paths are zero-based, comma or slash separated:

- `"5"` = 6th top-level item
- `"1,3"` or `"1/3"` = top-level[1].children[3]

Use `findItemByIndex(indexPath)` to navigate the tree.

### Learn Callback for Cue Assignment

```typescript
toggle_cue: {
    name: 'Toggle Play/Stop',
    options: cueOptions(),
    callback: (event) => { /* toggle logic */ },
    learn: () => {
        if (!self.selectedItemUuid) return undefined
        return { lookupMode: 'uuid', cueId: self.selectedItemUuid }
    },
}
```

## API 2.1 Features (Companion 5.0+)

### Internal Actions in Presets

Presets can use Companion's built-in actions (API 2.1+):

- `internal:wait` — `{ time: number }` — wait N ms
- `internal:customLog` — `{ message: string }` — log message
- `internal:abortButton` — `{ skipReleaseActions?: boolean }` — abort button actions
- `internal:localVariableSet` — `{ name: string; value: string }` — set local variable

### Internal Feedbacks in Presets

- `internal:checkExpression` — `{ expression: string }` — boolean expression
- `internal:buttonPushed` — `{ treatSteppedAsPressed?: boolean }` — button pressed state
- `internal:buttonCurrentStep` — `{ step: number }` — current step

### Logic Building Blocks

- `internal:actionGroup` — group actions
- `internal:logicIf` — conditional logic
- `internal:logicWhile` — loop
- `internal:logicOperator` — and/or/xor

### ActionsSchema Type (API 2.1)

```typescript
// API 2.1 requires explicit type definition:
export type ActionsSchema = {
	action_name: { options: OptionType }
	// ...
}
```

## Build & Package

### Commands

- `yarn build` — TypeScript → `dist/` (for development)
- `yarn package` — build + bundle → `pkg/liveplay/` + `.tgz` (for Companion)

### Installation

Copy `pkg/liveplay` to Companion modules directory:

- Windows: `%APPDATA%/companion/modules/`
- Linux: `~/.companion/modules/`

### Git Hygiene

- Never commit `dist/`, `pkg/`, or `*.tgz`
- Never commit debug logs (`liveplay-debug-*.json`)
- Use conventional commits: `feat(scope):`, `fix(scope):`, etc.

## Commit Policy

### Types

- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code change that neither fixes nor adds
- **perf**: Performance improvement
- **docs**: Documentation only
- **chore**: Other changes (build, CI, etc.)

### Scopes

- **main**: Main module class
- **actions**: Action definitions
- **feedbacks**: Feedback definitions
- **variables**: Variable definitions
- **presets**: Preset definitions
- **api**: REST/WebSocket client
- **types**: Type definitions
- **ws**: WebSocket client
- **connect**: Connection logic
- **state**: State management
- **update-loop**: Update loop logic
