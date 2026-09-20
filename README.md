<p align="center">
  <img src="./public/paprbndr-logo.svg" width="84" height="84" alt="Paprbndr Logo" />
  <h1 align="center">Paprbndr</h1>
  <p align="center">
    <b>Modern, Private, Client-Side PDF Studio & Comparator</b><br />
    <i>Zero cloud uploads • Zero telemetry • 100% in-browser RAM</i>
  </p>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vitejs.dev)
[![Privacy Guaranteed](https://img.shields.io/badge/Privacy-100%25%20Local-10b981.svg)](#privacy-first-architecture)

---

## ✦ Why Paprbndr?

Most online PDF tools upload your sensitive financial statements, NDAs, medical records, and legal contracts to remote cloud servers to perform basic operations like merging, reorganizing, or comparing pages.

**Paprbndr** is engineered from the ground up to operate **entirely inside your browser's memory sandbox**. Your files never touch an external API, database, or third-party server. It combines the speed of desktop native utilities with the accessibility of a modern web interface.

---

## ✦ Core Features

### 1. 📄 High-DPI Document Reader
- **Canvas-Accelerated Rendering**: High-fidelity PDF rendering powered by `pdfjs-dist` with automatic pixel ratio scaling for Retina and 4K displays.
- **Fluid Zoom & Navigation**: Fit-to-width, fit-to-page, and custom percentage zoom presets (50%–300%).
- **Interactive Thumbnails**: Fast vertical sidebar with real-time page indicators.
- **Reading Layouts**: Continuous scroll or focused single-page view.
- **View Rotation**: Instant document rotation for landscape and portrait orientations.

### 2. 📑 Visual Merge & Page Organizer
- **Multi-File Staging**: Drag and drop multiple PDF documents simultaneously into an organized merge queue.
- **Granular Page Controls**:
  - Reorder individual pages within or across documents.
  - Rotate specific pages by 90° clockwise or counter-clockwise.
  - Soft-delete pages with immediate undo / restore capability.
- **Memory-Safe Client-Side Merging**: High-performance assembly via `pdf-lib` without memory leaks or buffer detachment.
- **Edge-Ready Downloads**: Automatic local blob trigger with instant fallback download button if browser popups or download permissions are restricted.

### 3. 🔍 Visual Document Diff & Heatmap Comparator
- **Side-by-Side Synchronized Inspection**: Simultaneously view Version A and Version B of contracts, legal briefs, and technical specifications.
- **Interactive Split Swipe Slider**: Move a live divider handle across two overlaid documents to visually track subtle layout shifts, paragraph deletions, or date edits.
- **Pixel-Difference Visual Heatmap**: High-contrast diff engine highlighting:
  - 🟢 **Emerald Green**: Added text or elements in Version B.
  - 🔴 **Coral Red**: Removed text or elements from Version A.
- **Built-in Sample Contract Generator**: Instant one-click test fixture generator to demonstrate real-world revision diffing.

### 4. 🖨️ Duplex Rescue *(In Active Development)*
- **ADF Scanner Interleaving**: Automatically reconstructs documents scanned on single-sided automatic document feeders.
- Takes the **Odd-numbered stack** (scanned 1, 3, 5, 7...) and **Even-numbered stack** (scanned in reverse 8, 6, 4, 2...), re-aligns orientations, and interleaves them into a single, perfectly sequenced document.
- Handles blank back-page detection and one-click reversal corrections.

### 5. ✍️ Markdown to PDF Studio *(In Active Development)*
- Split-screen live Markdown editor with clean Swiss editorial typography.
- Export directly to formatted, print-perfect PDF.
- 1-click **"Send to Paprbndr Merger"** pipeline to seamlessly combine generated notes, cover letters, and reports with existing documents.

---

## ✦ Privacy-First Architecture

| Feature | Typical Cloud PDF Tools | **Paprbndr** |
| :--- | :--- | :--- |
| **Server Uploads** | Yes (Sent to third-party cloud servers) | **Zero (0 bytes transmitted)** |
| **Data Retention** | Stored on server temp storage / S3 | **Only in volatile browser RAM** |
| **Authentication** | Required for larger files / merge limits | **No account needed, no limits** |
| **Tracking / Telemetry** | Analytics trackers & cookies | **Zero analytics or trackers** |
| **Offline Support** | Cannot operate without internet | **Runs fully local and offline** |

---

## ✦ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (`@reduxjs/toolkit`, `react-redux`)
- **PDF Engines**:
  - `pdfjs-dist` (High-performance canvas rendering & thumbnail generation)
  - `pdf-lib` (Client-side PDF document manipulation, extraction, rotation, and merging)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linting & Code Quality**: [Oxlint](https://oxc.rs/)

---

## ✦ Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm / yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/paprbndr.git

# Navigate to project directory
cd paprbndr

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser to start using Paprbndr.

### Building for Production

```bash
# Type check and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## ✦ License

This project is licensed under the [MIT License](./LICENSE) — Copyright © 2026 Janarthanan.
