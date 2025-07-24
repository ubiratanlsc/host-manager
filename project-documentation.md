# JEXT Project Documentation

Jext is a cross-platform terminal application built with Tauri (Rust backend) and React (frontend). It provides terminal emulation functionality with support for both local PTY (Pseudo-Terminal) sessions and SSH connections.

## Project Structure

```
project/
├── src/                  # Frontend React code
│   ├── Terminal/         # Terminal-related components
│   ├── ssh/              # SSH-related components
│   ├── context/          # React contexts
│   └── assets/           # Static assets
├── src-tauri/            # Rust backend code
│   ├── capabilities/     # Tauri capabilities configuration
│   ├── src/              # Rust source code
│   │   ├── pty/          # PTY handling modules
│   │   ├── shell/        # Shell detection modules
│   │   └── ssh/          # SSH connection modules
│   └── Cargo.toml        # Rust dependencies
├── public/               # Static public files
└── various config files  # (.gitignore, tailwind.config.js, etc.)
```

## Backend (Rust) Components

### `/src-tauri/src/lib.rs`

The main entry point for the Rust backend that initializes the application state and defines the available Tauri commands.

Key components:
- `jexpeState`: Main application state struct that holds:
  - `ptys`: A thread-safe HashMap of active PTY processes
  - `ssh_sessions`: A thread-safe HashMap of active SSH sessions

### `/src-tauri/src/pty/`

Handles creation and management of local pseudo-terminals.

#### `/src-tauri/src/pty/mod.rs`
Defines the `PtyProcess` struct and related types for PTY management.

#### `/src-tauri/src/pty/commands.rs`
Implements Tauri commands for PTY operations:
- `spawn_pty`: Creates a new PTY process with the specified shell
- `write_pty`: Sends input to a PTY
- `resize_pty`: Changes the size of a PTY
- `kill_pty`: Terminates a PTY process

#### `/src-tauri/src/pty/constants.rs`
Defines constants used in PTY operations:
- `MAX_PIPE_CHUNK_SIZE`: Maximum buffer size for reading from pipes
- `READ_PAUSE_DURATION`: Duration to sleep between read operations
- Event names for PTY events

### `/src-tauri/src/shell/`

Detects and provides information about available system shells.

#### `/src-tauri/src/shell/mod.rs`
Defines the `SystemShell` struct that represents a shell in the system.

#### `/src-tauri/src/shell/commands.rs`
Implements the `get_system_shells` command to retrieve available shells in the system.

#### `/src-tauri/src/shell/unix.rs`
Implements shell detection for Unix-like systems by reading from `/etc/shells`.

#### `/src-tauri/src/shell/windows.rs`
Implements shell detection for Windows systems using registry keys and environmental variables to find:
- CMD
- PowerShell
- PowerShell Core
- Visual Studio Developer Prompt
- (Commented out) Git Bash and WSL distributions

### `/src-tauri/src/ssh/`

Handles creation and management of SSH connections.

#### `/src-tauri/src/ssh/mod.rs`
Defines the `SshSession` struct and related types for SSH management.

#### `/src-tauri/src/ssh/commands.rs`
Implements Tauri commands for SSH operations:
- `spawn_ssh`: Creates a new SSH session
- `write_ssh`: Sends commands to an SSH session
- `kill_ssh`: Terminates an SSH session
- `cleanup_inactive_sessions`: Removes inactive SSH sessions
- `heartbeat`: Updates the last activity timestamp for an SSH session
- `shutdown_all_sessions`: Terminates all SSH sessions
- `reconnect_session`: Attempts to reconnect to an existing session

#### `/src-tauri/src/ssh/constants.rs`
Defines constants used in SSH operations:
- Event names for SSH events
- Timeout durations
- Buffer sizes

## Frontend (React) Components

### `/src/App.jsx`

Main application component that wraps the application with providers and renders the main UI.

### `/src/Home.jsx`

Home page component that displays a button to create terminals and a list of active terminals.

### `/src/Terminal/`

Components related to local terminal emulation.

#### `/src/Terminal/Terminal.jsx`
Provides the `TerminalProvider` context that manages terminal state and operations:
- Tracks active terminals
- Handles PTY events
- Provides methods to interact with terminals

#### `/src/Terminal/TerminalComponent.jsx`
Renders an individual terminal using xterm.js and manages terminal addons:
- FitAddon for terminal resizing
- WebLinksAddon for clickable links
- Unicode11Addon for Unicode support
- SearchAddon for text search

#### `/src/Terminal/TerminalList.jsx`
Renders a list of active terminals.

#### `/src/Terminal/Constants.jsx`
Defines constants used in the frontend terminal components:
- Event names matching the backend
- Command names for Tauri invocation

### `/src/ssh/`

Components related to SSH terminal emulation.

#### `/src/ssh/SSH.jsx`
Provides the `SSHProvider` context that manages SSH state and operations:
- Tracks active SSH sessions
- Handles SSH events
- Provides methods to interact with SSH sessions

#### `/src/ssh/SSHComponent.jsx`
Renders an individual SSH terminal using xterm.js.

#### `/src/ssh/Constants.jsx`
Defines constants used in the frontend SSH components.

### `/src/context/`

React contexts for state management.

#### `/src/context/TerminalContext.jsx`
Context for managing terminal state.

#### `/src/context/SSHContext.jsx`
Context for managing SSH state.

## Key Features and Functionality

### Local Terminal (PTY)
- Spawns local terminal sessions using the system's available shells
- Handles input/output via Rust's portable-pty library
- Manages terminal lifecycle (create, resize, terminate)

### SSH Terminal
- Connects to remote servers via SSH
- Supports authentication via password or SSH key
- Manages SSH session lifecycle
- Includes heartbeat mechanism to detect inactive sessions

### Terminal UI
- Uses xterm.js for terminal emulation
- Supports various terminal features:
  - Unicode characters
  - Terminal resizing
  - Text search
  - Clickable links
  - Custom styling

## Configuration Files

### `/src-tauri/Cargo.toml`
Defines Rust dependencies for the Tauri backend:
- `tauri`: Core Tauri framework
- `serde`/`serde_json`: Serialization/deserialization
- `tokio`: Async runtime
- `portable-pty`: Cross-platform PTY handling
- `ssh2`: SSH client library
- `cuid`/`cuid2`: Unique ID generation

### `/src-tauri/tauri.conf.json`
Tauri configuration specifying:
- Application metadata
- Window settings
- Build configurations
- Security policies

### `/package.json`
Defines Node.js dependencies for the React frontend:
- `react`/`react-dom`: Core React framework
- `@tauri-apps/api`: Tauri client API
- `@xterm/xterm` and addons: Terminal emulation
- `lucide-react`: Icon library
- `ahooks`: Additional React hooks

### `/tailwind.config.js`
Configuration for Tailwind CSS styling.

### `/vite.config.js`
Configuration for Vite bundler with Tauri-specific settings.

## Implementation Notes

- The application uses a multi-threaded architecture with Tokio for async operations
- Terminal I/O is handled via separate read/write tasks to prevent blocking
- The frontend communicates with the backend via Tauri's IPC mechanism
- Terminal data is streamed between frontend and backend using byte arrays
- The SSH implementation includes special handling for command input/output formatting
