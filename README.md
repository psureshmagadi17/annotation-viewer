# PDF Annotation Viewer

A lightweight web-based PDF viewer for reviewing and providing feedback on annotations extracted directly from annotated PDFs.

## Features

- **Single File Workflow**: Load annotated PDFs directly (no separate annotation files needed)
- **PDF Annotation Extraction**: Automatically extract annotations from PDF comments/highlights/bookmarks using pdf-lib
- **Interactive Viewer**: Toggle annotation visibility and filter by type/status
- **Sidebar Navigation**: Virtualized list of annotations with click-to-jump functionality
- **Feedback Capture**: Mark annotations as correct/incorrect/needs edit with optional notes
- **Multi-Format Export**: Export feedback as JSON, CSV, or XFDF (Adobe compatibility)
- **Keyboard Shortcuts**: Efficient navigation and feedback entry
- **Local-First Storage**: IndexedDB for session persistence

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd annotation-viewer
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to http://localhost:5173

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Serve the built files:**
   ```bash
   # Option 1: Using Python
   python -m http.server 8000 --directory dist
   
   # Option 2: Using Node.js serve
   npx serve dist
   
   # Option 3: Using any static file server
   ```

3. **Access the application:**
   Open http://localhost:8000 in your browser

## Usage

### Basic Workflow

1. **Load Annotated PDF**: 
   - Click "Open PDF" button or drag & drop a PDF file
   - The app will automatically extract annotations from the PDF

2. **Review Annotations**:
   - Use the sidebar to navigate through annotations
   - Click on annotations to jump to their location in the PDF
   - Toggle annotation visibility with the overlay toggle

3. **Provide Feedback**:
   - Select an annotation to open the feedback panel
   - Mark as correct/incorrect/needs edit using buttons or keyboard shortcuts
   - Add optional notes for each annotation

4. **Export Feedback**:
   - Export your feedback as JSON (for retraining)
   - Export as CSV (for spreadsheet analysis)
   - Export as XFDF (for Adobe compatibility)

### Keyboard Shortcuts

- `←` / `→`: Navigate to previous/next annotation
- `1` / `2` / `3`: Mark annotation as correct/incorrect/needs edit
- `F`: Toggle annotation overlay visibility
- `E`: Focus on notes field

## Technical Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI components
- **PDF Rendering**: PDF.js for document display
- **PDF Processing**: pdf-lib for annotation extraction
- **State Management**: Zustand for application state
- **Storage**: IndexedDB for local persistence
- **Virtualization**: @tanstack/react-virtual for performance

## File Structure

```
src/
├── components/          # React components
│   └── ui/             # Reusable UI components (Radix-based)
├── lib/                # Utility libraries
│   ├── pdf-annotation-extractor.ts  # PDF annotation extraction
│   ├── xfdf-exporter.ts            # XFDF export functionality
│   ├── file-handler.ts             # File I/O utilities
│   ├── pdf-worker.ts               # PDF.js worker setup
│   └── utils.ts                    # General utilities
├── types/              # TypeScript type definitions
├── stores/             # State management (Zustand)
└── hooks/              # Custom React hooks
```

## Development Notes

- The app requires a local server to run (not `file://`) due to PDF.js worker restrictions
- PDF annotation extraction supports highlights, comments, bookmarks, and other standard PDF annotation types
- Coordinates are automatically normalized for consistent display across different PDF sizes
- All feedback is stored locally and can be exported in multiple formats

## Troubleshooting

- **PDF not loading**: Ensure you're running via a local server (not opening HTML file directly)
- **Annotations not showing**: Check that the PDF contains annotations (comments, highlights, etc.)
- **Performance issues**: Large PDFs are handled with lazy loading and virtualization
