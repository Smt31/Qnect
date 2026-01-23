# Gemini Response Rendering System

This document provides a technical breakdown of how the application formats and renders responses from the Gemini model. The system transforms raw Markdown text into rich, interactive React components suitable for a premium user experience.

## 1. Architecture Overview

The rendering pipeline relies on a stack of specific libraries to process the Markdown stream:

*   **Parser**: `react-markdown`
    *   *Role*: Parses the raw Markdown string and converts it into a React Virtual DOM structure.
*   **Extensions**: `remark-gfm`
    *   *Role*: Adds support for GitHub Flavored Markdown (GFM) features like tables, strikethrough, and task lists, which are not in the standard Markdown spec.
*   **Syntax Highlighting**: `rehype-highlight` & `highlight.js`
    *   *Role*: Detects code blocks, identifies the language (e.g., Python, Java), and applies syntax coloring classes.

## 2. Rendering Implementation Details

The core logic is encapsulated in `src/components/MarkdownRenderer.jsx`. The component customizes the rendering of specific HTML elements found in the Markdown.

### Feature Mapping Table

| Feature | Detection (Markdown) | Rendered Component | Styling Class | Implementation Detail |
| :--- | :--- | :--- | :--- | :--- |
| **Paragraphs** | Double newline | `<p>` | `.markdown-paragraph` | Enforces specific line-height (1.7) and margins for readability. |
| **Code Blocks** | \`\`\`language | `<pre><code>` | `.markdown-code-block` | Wrapped in a custom `div` that injects a **Copy to Clipboard** button. Uses `rehype-highlight` for syntax coloring. |
| **Inline Code** | \`code\` | `<code>` | `.markdown-inline-code` | Rendered with a distinct font (Consolas/Monaco) and color (blue) to distinguish from regular text. |
| **Tables** | `\| col \| col \|` | `table` | N/A | Powered by `remark-gfm`. The CSS targets `.markdown-renderer table` to add borders, padding, and zebra-striping rows. |
| **Headers** | `#`, `##`, `###` | `h1`, `h2`, `h3` | `.markdown-hX` | Custom classes enforce hierarchy sizing and visual separation (bottom borders for H1/H2). |
| **Lists** | `-` or `1.` | `ul`, `ol`, `li` | `.markdown-list` | Adds proper indentation and bullet styling. |
| **Blockquotes** | `> text` | `blockquote` | `.markdown-blockquote` | Adds a left border line and grey background to visually distinguish quotes. |

## 3. Special Features

### Smart Code Blocks
The `code` renderer in `MarkdownRenderer.jsx` is intelligent:
1.  **Inline vs Block**: It checks the `inline` prop to decide whether to render a span-like code element or a full block.
2.  **Copy Functionality**: For code blocks, it automatically appends a generic "Copy" button that interacts with the `navigator.clipboard` API.
3.  **Short Blocks**: If a block is detected but is very short and single-line (often a misformatted Inline Code from the AI), logic exists to heuristically render it as inline code for better visuals.

### CSS Styling Strategy
Styles are isolated in `src/components/MarkdownRenderer.css` using the BEM-like naming convention (e.g., `.markdown-renderer .markdown-paragraph`) to prevent leaks into the rest of the application.
