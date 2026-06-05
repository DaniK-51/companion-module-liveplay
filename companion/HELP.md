# LivePlay Companion Module

## Overview
The LivePlay Companion module provides comprehensive control over LivePlay, an open-source audio playback system for live productions. This module integrates LivePlay with Bitfocus Companion, allowing you to control audio cues, manage projects, and monitor playback status directly from your Companion buttons.

## Requirements
- LivePlay server running (version 2.0 or later)
- Network connection between Companion and LivePlay server
- LivePlay project loaded on the server

## Setup Instructions

### 1. Configure LivePlay Server
1. Start LivePlay on your audio playback machine
2. Note the server IP address and port (default: 4480)
3. Ensure the server is accessible from your Companion machine

### 2. Configure LivePlay Module in Companion
1. Add a new LivePlay instance in Companion
2. Enter the LivePlay server IP address
3. Set the port (default: 4480)
4. Configure connection timeout (default: 5000ms)
5. Enable debug logging if troubleshooting connection issues

### 3. Connection Status
- **Green**: Connected to LivePlay server
- **Red**: Connection failed or server unreachable
- **Yellow**: Connecting or reconnecting

## Actions

### Transport Controls
- **Play**: Start playback of selected cue
- **Stop**: Stop playback with fade-out
- **Pause**: Pause current playback
- **Resume**: Resume paused playback
- **Stop All**: Stop all playing cues
- **Next**: Play next cue in sequence
- **Previous**: Play previous cue in sequence

### Cue Controls
- **Play Cue**: Play specific cue by UUID
- **Stop Cue**: Stop specific cue by UUID
- **Pause Cue**: Pause specific cue by UUID
- **Seek**: Seek to specific position in cue
- **Set Volume**: Set cue volume (dB)
- **Set Fade In**: Set cue fade-in duration (ms)
- **Set Fade Out**: Set cue fade-out duration (ms)

### Project Controls
- **Load Project**: Load LivePlay project
- **Save Project**: Save current project
- **Refresh Project**: Refresh project data

### Cart Controls
- **Play Cart**: Play cue from specific cart slot
- **Clear Cart**: Clear cart slot contents

### Mixer Controls
- **Create Mixer**: Create new mixer channel
- **Set Mixer Volume**: Set mixer channel volume
- **Mute Mixer**: Mute/unmute mixer channel
- **Solo Mixer**: Solo/unsolo mixer channel

### Device Controls
- **List Devices**: List available audio devices
- **Open Device**: Open audio device for output
- **Close Device**: Close audio device

## Feedbacks

### Player Status
- **Is Playing**: True when any cue is playing
- **Is Paused**: True when any cue is paused
- **Is Stopped**: True when no cues are playing
- **Connection Status**: Connection to LivePlay server
- **Project Loaded**: True when a project is loaded

### Cue-Specific Feedbacks
- **Cue Is Playing**: True for specific cue
- **Cue Is Paused**: True for specific cue
- **Cue Is Stopped**: True for specific cue
- **Cue Volume**: Volume level of specific cue
- **Cue Transport State**: Transport state of specific cue

### System Feedbacks
- **Current Position**: Current playhead position (seconds)
- **Current Duration**: Current cue duration (seconds)
- **Progress Percentage**: Playback progress (0-100%)
- **Master Volume**: Master output volume
- **Loading Progress**: Project loading progress

## Variables

### Player Variables
- `player_state`: Current player state (playing/paused/stopped)
- `player_position`: Current playhead position (seconds)
- `player_position_formatted`: Current position (MM:SS)
- `player_duration`: Current cue duration (seconds)
- `player_duration_formatted`: Duration (MM:SS)
- `player_progress`: Progress percentage (0-100)
- `master_volume`: Master volume level

### Cue Variables
- `current_cue_title`: Title of currently playing cue
- `current_cue_artist`: Artist of currently playing cue
- `current_cue_id`: ID of currently playing cue
- `current_cue_uuid`: UUID of currently playing cue
- `current_cue_position`: Position of current cue (seconds)
- `current_cue_volume`: Volume of current cue (dB)

### Project Variables
- `project_name`: Name of loaded project
- `project_cue_count`: Number of cues in project
- `project_group_count`: Number of groups in project
- `cart_slot_1-16`: Contents of cart slots (1-16)

## Usage Examples

### Basic Playback Control
1. Create a button with "Play" action
2. Create a button with "Stop" action
3. Create a button with "Pause" action
4. Use feedbacks to show current playback status

### Cue-Specific Control
1. Load a project with multiple cues
2. Create buttons for each cue using "Play Cue" action
3. Use "Cue Is Playing" feedback to show active cue
4. Use variables to display cue information

### Cart System
1. Assign frequently used cues to cart slots
2. Create cart buttons for instant playback
3. Use cart feedbacks to show slot contents

### Mixer Control
1. Create mixer channels for different outputs
2. Set up volume controls for each mixer
3. Use mute/solo feedbacks for visual feedback

## Troubleshooting

### Connection Issues
- **Cannot connect to server**: Check IP address and port
- **Connection timeout**: Increase timeout in configuration
- **Server unreachable**: Check network connectivity and firewall

### Project Issues
- **Project won't load**: Verify project file exists and is accessible
- **Cues not found**: Check if cues are properly loaded in LivePlay
- **Missing media**: Ensure media files are in correct location

### Performance Issues
- **Slow updates**: Reduce update frequency in settings
- **High CPU usage**: Disable unnecessary feedbacks and variables
- **Network lag**: Check network bandwidth and latency

## Tips and Best Practices

1. **Use feedbacks** to provide visual feedback on button states
2. **Organize buttons** by function (transport, cues, mixers)
3. **Use variables** in button text for dynamic information
4. **Set up proper error handling** for critical operations
5. **Test connections** before live use
6. **Use cart slots** for quick access to frequently used cues
7. **Organize cues** by groups for better organization
8. **Use mixer channels** for complex routing scenarios

## Advanced Features

### Multi-Device Routing
- Route cues to different audio devices
- Create separate mixes for FOH and monitors
- Use master output controls for overall volume

### Real-Time Monitoring
- Use meter feedbacks for visual level monitoring
- Monitor individual cue levels
- Track master output levels

### Automation Integration
- Use Companion variables in external systems
- Trigger cues based on external events
- Sync with other show control systems

## Support
For issues and feature requests, please check:
- LivePlay documentation: https://github.com/tdoukinitsas/liveplay
- Companion module documentation
- Community forums for both LivePlay and Companion
