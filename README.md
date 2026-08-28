# companion-module-liveplay

Bitfocus Companion module for [LivePlay](https://github.com/tdoukinitsas/liveplay) — an open-source audio playback system for live productions.

## Features

- **Cue Control**: Play, stop, pause, resume, seek, toggle
- **Three Lookup Modes**: By UUID, engine cue ID, or playlist index
- **Learn-to-Assign**: Select a cue in LivePlay, press Learn in Companion
- **Real-time Feedback**: Transport state, meters, selection tracking
- **22 Variables**: Player state, cue metadata, meters, project info
- **7 Feedbacks**: Connection, transport state, cue-specific, assignment ready

## Getting Started

```bash
yarn              # Install dependencies
yarn build        # Build for development
yarn package      # Build for Companion (creates pkg/ + .tgz)
```

Copy `pkg/liveplay` to your Companion modules directory.

## Documentation

- [User Guide](./companion/HELP.md) — Setup, actions, feedbacks, variables
- [Implementation Status](./PLAN.md) — Architecture and feature status
- [Agent Guide](./AGENTS.md) — Development patterns and pitfalls

## License

MIT
