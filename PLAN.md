# LivePlay Companion Module Implementation Plan

## Overview
This document outlines the implementation plan for a Bitfocus Companion module that integrates with LivePlay, an open-source audio playback system for live productions. The module will provide comprehensive control over LivePlay's REST API and WebSocket interface.

## Architecture Overview

### LivePlay API Structure
- **REST API**: Port 4480 for control commands
- **WebSocket**: Port 4480 for real-time data (~60Hz meter updates)
- **Discovery**: UDP 4481 for LAN auto-discovery
- **Authentication**: None (open API for local network)

### Key Components
1. **Connection Management**: Handle REST API and WebSocket connections
2. **Project Management**: Load, save, and manage LivePlay projects
3. **Cue Control**: Play, stop, pause, seek, and control individual cues
4. **Transport Control**: Master transport controls (stop all, etc.)
5. **Feedback System**: Real-time status updates via Companion feedbacks
6. **Variable System**: Expose LivePlay data as Companion variables
7. **Preset System**: Create Companion button presets for common operations

## Implementation Phases

### Phase 1: Core Infrastructure
1. **Connection Management**
   - Implement REST API client for LivePlay
   - Implement WebSocket client for real-time updates
   - Add connection status monitoring
   - Handle connection failures and reconnection logic

2. **Basic Configuration**
   - Host/IP configuration
   - Port configuration (default: 4480)
   - Connection timeout settings
   - Debug logging options

### Phase 2: Project Management
1. **Project Operations**
   - Load projects from LivePlay server
   - Save projects to LivePlay server
   - List available projects
   - Create new projects

2. **Project Data Synchronization**
   - Sync project structure (cues, groups, cart)
   - Sync routing matrix
   - Sync theme and settings
   - Handle project state changes via WebSocket

### Phase 3: Cue Control System
1. **Cue Operations**
   - Play cue by UUID or cue ID
   - Stop cue by UUID or cue ID
   - Pause/Resume cue
   - Seek to position
   - Set cue gain
   - Set cue fade times

2. **Transport Controls**
   - Stop all cues with fade
   - Master play/pause/stop
   - Next/Previous track navigation

### Phase 4: Feedback System
1. **Player Status Feedbacks**
   - Is playing (boolean)
   - Is paused (boolean)
   - Is stopped (boolean)
   - Current playhead position
   - Current duration
   - Progress percentage

2. **Cue-Specific Feedbacks**
   - Specific cue is playing
   - Specific cue is paused
   - Specific cue is stopped
   - Cue volume level
   - Cue transport state

3. **System Feedbacks**
   - Connection status
   - Project loaded status
   - Audio loading progress

### Phase 5: Variable System
1. **Player Variables**
   - Current player state
   - Current position (seconds and formatted)
   - Current duration (seconds and formatted)
   - Current progress percentage
   - Current volume level

2. **Cue Variables**
   - Current playing cue title
   - Current playing cue artist
   - Current playing cue duration
   - Current playing cue position
   - Current playing cue progress

3. **Project Variables**
   - Project name
   - Number of cues
   - Number of groups
   - Current cart slot contents

### Phase 6: Advanced Features
1. **Routing Control**
   - Route cues to specific mixers
   - Route mixers to master outputs
   - Route master outputs to devices
   - Device management (open/close devices)

2. **Mixer Control**
   - Create/destroy mixer channels
   - Set mixer volume
   - Set mute/solo states
   - Mixer meter feedback

3. **Cart System**
   - Set cart slot contents
   - Play cart slot contents
   - Clear cart slots

4. **Preview System**
   - Start/stop preview
   - Preview volume control
   - Preview feedback

### Phase 7: Presets and UI
1. **Button Presets**
   - Basic transport controls (play, stop, pause)
   - Cue-specific controls
   - Cart slot buttons
   - Mixer controls
   - Routing presets

2. **Feedback Styling**
   - Color coding for player states
   - Volume level indicators
   - Progress indicators
   - Connection status indicators

## File Structure

```
src/
├── main.ts                 # Main module class
├── config.ts              # Configuration fields
├── actions.ts             # Action definitions
├── feedbacks.ts           # Feedback definitions
├── variables.ts           # Variable definitions
├── presets.ts            # Preset definitions
├── upgrades.ts            # Upgrade scripts
└── liveplay-client.ts     # LivePlay API client
```

## API Integration Details

### REST API Endpoints to Implement
- `GET /api/health` - Connection check
- `GET /api/devices` - List audio devices
- `GET /api/project` - Get full project
- `GET /api/project/items` - Get project items
- `POST /api/project/items/{uuid}/play` - Play item
- `POST /api/project/items/{uuid}/stop` - Stop item
- `POST /api/transport/stop_all` - Stop all
- `POST /api/master/gain` - Master volume
- `GET /api/mixers` - List mixers
- `POST /api/routing/` - Routing operations

### WebSocket Events to Handle
- `meters` - Real-time meter updates
- `cue_state` - Cue transport changes
- `doc_patch` - Project state changes
- `playback_snapshot` - Current state snapshot

## Error Handling
- Connection timeouts and retries
- API error responses
- WebSocket disconnection handling
- Invalid cue/item handling
- File system errors

## Performance Considerations
- Efficient WebSocket message handling
- Debounce rapid updates
- Cache frequently accessed data
- Minimize unnecessary API calls
- Use proper connection pooling

## Testing Strategy
1. **Unit Tests**
   - API client functionality
   - Action/feedback callbacks
   - Variable updates
   - Error handling

2. **Integration Tests**
   - Connection establishment
   - Project loading/saving
   - Cue control operations
   - Real-time updates

3. **End-to-End Tests**
   - Full workflow testing
   - Multiple simultaneous operations
   - Error recovery scenarios

## Deployment
1. **Package Configuration**
   - Update package.json with proper metadata
   - Configure build scripts
   - Set up development environment

2. **Documentation**
   - User setup instructions
   - Configuration guide
   - Action/feedback reference
   - Troubleshooting guide

## Timeline
- **Phase 1**: 2-3 days (Core infrastructure)
- **Phase 2**: 2-3 days (Project management)
- **Phase 3**: 2-3 days (Cue control)
- **Phase 4**: 2-3 days (Feedback system)
- **Phase 5**: 2-3 days (Variable system)
- **Phase 6**: 3-4 days (Advanced features)
- **Phase 7**: 2-3 days (Presets and UI)
- **Testing & Documentation**: 3-4 days

**Total Estimated Time**: 20-25 days

## Dependencies
- `@companion-module/base` - Base module functionality
- `ws` - WebSocket client (if not included in base)
- `axios` or `fetch` - HTTP client for REST API

## Success Criteria
1. Module successfully connects to LivePlay server
2. Can load and control LivePlay projects
3. Provides comprehensive feedback and variable systems
4. Supports real-time updates via WebSocket
5. Includes proper error handling and recovery
6. Well-documented and user-friendly