import React, { useState, useEffect, useRef } from "react";

interface CodeViewerProps {
  fileName: string;
  content: string;
  language?: string;
}

const BINARY_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "ico", "pdf", "zip", "gz", "tar", "rar",
  "7z", "mp3", "mp4", "wav", "avi", "mov", "exe", "dll", "so", "pyc",
  "db", "sqlite", "woff", "woff2", "ttf", "eot", "png", "jpg"
];

const isBinaryFile = (fileName: string): boolean => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return !!ext && BINARY_EXTENSIONS.includes(ext);
};

export const CodeViewer: React.FC<CodeViewerProps> = ({
  fileName,
  content,
  language = "text"
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [loadLargeFile, setLoadLargeFile] = useState(false);

  const lines = content.split("\n");
  const isLarge = lines.length > 2000 || content.length > 100000;
  const displayedLines = isLarge && !loadLargeFile ? lines.slice(0, 500) : lines;

  // Reset view mode and large file states when loading a new file
  useEffect(() => {
    setViewMode("code");
    setLoadLargeFile(false);
    setShowSearch(false);
    setSearchQuery("");
    setCurrentMatchIndex(0);
  }, [fileName, content]);

  // Compute search matches globally on displayed lines only
  const matches: { lineIdx: number; startIdx: number; endIdx: number }[] = [];
  if (showSearch && searchQuery.trim().length >= 2) {
    const query = searchQuery.toLowerCase();
    displayedLines.forEach((line, lineIdx) => {
      let startIdx = 0;
      const lineLower = line.toLowerCase();
      while (true) {
        const idx = lineLower.indexOf(query, startIdx);
        if (idx === -1) break;
        matches.push({ lineIdx, startIdx: idx, endIdx: idx + query.length });
        startIdx = idx + query.length;
      }
    });
  }

  // Scroll active match into view
  useEffect(() => {
    if (showSearch && matches.length > 0) {
      const activeMatchEl = document.getElementById("active-search-match-el");
      if (activeMatchEl) {
        activeMatchEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentMatchIndex, searchQuery, showSearch]);

  // Handle keyboard shortcut Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const highlightText = (text: string, lineIdx: number, charIdxStart: number) => {
    if (!showSearch || searchQuery.trim().length < 2) return <span>{text}</span>;

    const query = searchQuery.toLowerCase();
    const textLower = text.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;

    while (true) {
      const idx = textLower.indexOf(query, lastIdx);
      if (idx === -1) {
        parts.push(text.substring(lastIdx));
        break;
      }

      parts.push(text.substring(lastIdx, idx));

      const matchGlobalStart = charIdxStart + idx;
      const globalMatchIdx = matches.findIndex(
        (m) => m.lineIdx === lineIdx && m.startIdx === matchGlobalStart
      );
      const isActive = globalMatchIdx === currentMatchIndex;

      parts.push(
        <mark
          key={idx}
          className={`code-search-highlight ${isActive ? "active-search-highlight" : ""}`}
          id={isActive ? "active-search-match-el" : undefined}
        >
          {text.substring(idx, idx + query.length)}
        </mark>
      );

      lastIdx = idx + query.length;
    }

    return <>{parts}</>;
  };

  const tokenizeLine = (line: string, lineIdx: number, lang: string) => {
    if (!line.trim()) return <span>&nbsp;</span>;

    // Comments styling
    if (line.trim().startsWith("#") || line.trim().startsWith("//") || line.trim().startsWith("/*")) {
      return <span className="syntax-comment">{highlightText(line, lineIdx, 0)}</span>;
    }

    const tokens: React.ReactNode[] = [];
    let currentWord = "";
    let inString = false;
    let stringChar = "";
    let i = 0;
    let wordStartIdx = 0;

    while (i < line.length) {
      const char = line[i];

      if (inString) {
        currentWord += char;
        if (char === stringChar && line[i - 1] !== "\\") {
          inString = false;
          tokens.push(
            <span key={i} className="syntax-string">
              {highlightText(currentWord, lineIdx, wordStartIdx)}
            </span>
          );
          currentWord = "";
        }
        i++;
        continue;
      }

      if (char === '"' || char === "'") {
        if (currentWord) {
          tokens.push(parseWord(currentWord, lang, i, lineIdx, wordStartIdx));
          currentWord = "";
        }
        inString = true;
        stringChar = char;
        currentWord = char;
        wordStartIdx = i;
        i++;
        continue;
      }

      if ("(){}[]+-*/%=:;,. \t<>!&|?".includes(char)) {
        if (currentWord) {
          tokens.push(parseWord(currentWord, lang, i, lineIdx, wordStartIdx));
          currentWord = "";
        }
        tokens.push(
          <span key={`divider-${i}`} className="syntax-divider">
            {highlightText(char, lineIdx, i)}
          </span>
        );
      } else {
        if (!currentWord) {
          wordStartIdx = i;
        }
        currentWord += char;
      }
      i++;
    }

    if (currentWord) {
      tokens.push(parseWord(currentWord, lang, i, lineIdx, wordStartIdx));
    }

    return <>{tokens}</>;
  };

  const parseWord = (
    word: string,
    lang: string,
    index: number,
    lineIdx: number,
    wordStartIdx: number
  ): React.ReactNode => {
    if (/^\d+$/.test(word)) {
      return (
        <span key={index} className="syntax-number">
          {highlightText(word, lineIdx, wordStartIdx)}
        </span>
      );
    }

    const pythonKeywords = [
      "def", "class", "import", "from", "return", "if", "elif", "else", "try",
      "except", "finally", "in", "not", "and", "or", "pass", "yield", "as"
    ];
    const jsKeywords = [
      "const", "let", "var", "function", "export", "import", "default", "from",
      "return", "if", "else", "try", "catch", "finally", "class", "interface",
      "type", "extends", "implements", "as", "new", "true", "false", "null", "undefined"
    ];

    const isKeyword =
      lang === "python"
        ? pythonKeywords.includes(word)
        : jsKeywords.includes(word);

    if (isKeyword) {
      return (
        <span key={index} className="syntax-keyword">
          {highlightText(word, lineIdx, wordStartIdx)}
        </span>
      );
    }

    if (word[0] === word[0].toUpperCase() && isNaN(Number(word[0]))) {
      return (
        <span key={index} className="syntax-type">
          {highlightText(word, lineIdx, wordStartIdx)}
        </span>
      );
    }

    return (
      <span key={index} className="syntax-text">
        {highlightText(word, lineIdx, wordStartIdx)}
      </span>
    );
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code key={idx} className="md-inline-code">
                {part.slice(1, -1)}
              </code>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            return <em key={idx}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
      </>
    );
  };

  const renderMarkdownPreview = () => {
    return (
      <div className="markdown-preview-body">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="md-h1">
                {parseInlineMarkdown(trimmed.slice(2))}
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="md-h2">
                {parseInlineMarkdown(trimmed.slice(3))}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="md-h3">
                {parseInlineMarkdown(trimmed.slice(4))}
              </h3>
            );
          }
          if (trimmed.startsWith("#### ")) {
            return (
              <h4 key={idx} className="md-h4" style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "12px", marginBottom: "6px", color: "var(--text-secondary)" }}>
                {parseInlineMarkdown(trimmed.slice(5))}
              </h4>
            );
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={idx} className="md-li">
                {parseInlineMarkdown(trimmed.slice(2))}
              </li>
            );
          }
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote key={idx} className="md-blockquote">
                {parseInlineMarkdown(trimmed.slice(2))}
              </blockquote>
            );
          }
          if (trimmed === "---" || trimmed === "***") {
            return <hr key={idx} className="md-hr" />;
          }
          if (!trimmed) {
            return <div key={idx} className="md-spacing" />;
          }
          return (
            <p key={idx} className="md-p">
              {parseInlineMarkdown(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // Safe check for binary files
  if (isBinaryFile(fileName)) {
    return (
      <div className="code-viewer-container binary-preview-container">
        <div className="code-viewer-header">
          <div className="code-viewer-title-group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="file-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="code-viewer-filename">{fileName}</span>
          </div>
          <span className="code-viewer-meta">Binary File · Read Only</span>
        </div>
        <div className="binary-placeholder-view">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <circle cx="12" cy="13" r="3" />
            <path d="m12 10 .01-.01M9 16l6-6" />
          </svg>
          <h4>Binary file preview not available</h4>
          <p>This file format is not supported for text viewing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="code-viewer-container">
      {/* Viewer Header */}
      <div className="code-viewer-header">
        <div className="code-viewer-title-group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9f7aea" strokeWidth="2" className="file-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <path d="M14 3v5h5" />
          </svg>
          <span className="code-viewer-filename">{fileName}</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {(fileName.toLowerCase().endsWith(".md") || fileName.toLowerCase().endsWith(".markdown")) && (
            <div className="code-viewer-tabs-toggle">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "code" ? "active" : ""}`}
                onClick={() => setViewMode("code")}
              >
                Source
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => setViewMode("preview")}
              >
                Preview
              </button>
            </div>
          )}

          <button
            type="button"
            className={`btn-search-trigger ${showSearch ? "active" : ""}`}
            onClick={() => {
              setShowSearch(!showSearch);
              setSearchQuery("");
              setCurrentMatchIndex(0);
            }}
            title="Search inside file (Ctrl+F)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          
          <span className="code-viewer-meta">
            {lines.length} lines · {language.toUpperCase()} · Read Only
          </span>
        </div>
      </div>

      {/* Code viewport search overlay */}
      {showSearch && (
        <div className="code-viewer-search-bar">
          <input
            type="text"
            className="search-match-input"
            placeholder="Find in file..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentMatchIndex(0);
            }}
            autoFocus
          />
          <span className="search-match-count">
            {matches.length > 0 ? `${currentMatchIndex + 1} of ${matches.length}` : "0 matches"}
          </span>
          <button
            type="button"
            className="search-nav-btn"
            disabled={matches.length <= 1}
            onClick={() => setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length)}
          >
            &uarr;
          </button>
          <button
            type="button"
            className="search-nav-btn"
            disabled={matches.length <= 1}
            onClick={() => setCurrentMatchIndex((prev) => (prev + 1) % matches.length)}
          >
            &darr;
          </button>
          <button
            type="button"
            className="search-close-btn"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setCurrentMatchIndex(0);
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Code viewport / Preview mode */}
      <div className="code-viewer-body-wrapper" style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {viewMode === "preview" ? (
          renderMarkdownPreview()
        ) : (
          <div className="code-viewer-viewport">
            <div className="code-viewer-gutter">
              {displayedLines.map((_, idx) => (
                <div key={idx + 1} className="gutter-line-number">
                  {idx + 1}
                </div>
              ))}
            </div>
            <div className="code-viewer-content">
              {displayedLines.map((line, idx) => (
                <div key={idx} className="code-line">
                  {tokenizeLine(line, idx, language)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Large File notice banner */}
      {isLarge && !loadLargeFile && (
        <div className="large-file-banner">
          <span>Large file detected ({lines.length} lines). Displaying first 500 lines for performance.</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setLoadLargeFile(true)}
            style={{ padding: "2px 8px", fontSize: "0.7rem", height: "auto" }}
          >
            Load Entire File
          </button>
        </div>
      )}
    </div>
  );
};
