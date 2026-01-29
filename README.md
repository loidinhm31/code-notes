# Code Notes

A modern desktop application for managing code notes, questions, and quiz sessions built with Tauri, React, and TypeScript.

## Tech Stack

### Frontend

- **Framework**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite 7.0.4
- **Desktop Framework**: Tauri v2
- **UI Components**: shadcn/ui (built on Radix UI)
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-label`
  - `@radix-ui/react-select`
  - `@radix-ui/react-slot`
- **Styling**: Tailwind CSS v4.1.18
- **Component Variants**: class-variance-authority
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **State Management**: Zustand
- **Markdown**: @uiw/react-md-editor with syntax highlighting (rehype-prism-plus)

### Backend

- **Rust**: Tauri backend with filesystem and dialog plugins

## Features

- Question and topic management
- Quiz mode with confidence rating
- Progress tracking dashboard
- Import/Export functionality
- Markdown support with syntax highlighting
- Dark mode support
- Cross-platform (Linux, Windows, macOS, Android)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run Tauri development
pnpm tauri dev

# Build Tauri app
pnpm tauri build
```

## Project Structure

```
src/
├── components/
│   ├── atoms/         # Small reusable components
│   ├── molecules/     # Composite components
│   ├── organisms/     # Complex components
│   ├── pages/         # Page components
│   └── ui/            # shadcn/ui components
├── lib/               # Utility functions
└── styles/            # Global styles
```
