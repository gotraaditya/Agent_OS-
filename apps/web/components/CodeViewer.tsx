import React from "react";

interface CodeViewerProps {
  fileName: string;
  content: string;
  language?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  fileName,
  content,
  language = "text"
}) => {
  const lines = content.split("\n");

  const tokenizeLine = (line: string, lang: string) => {
    if (!line.trim()) return <span>&nbsp;</span>;

    // Comments styling
    if (line.trim().startsWith("#") || line.trim().startsWith("//") || line.trim().startsWith("/*")) {
      return <span className="syntax-comment">{line}</span>;
    }

    let tokens: React.ReactNode[] = [];
    let currentWord = "";
    let inString = false;
    let stringChar = "";
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      // String handling
      if (inString) {
        currentWord += char;
        if (char === stringChar && line[i - 1] !== "\\") {
          inString = false;
          tokens.push(<span key={i} className="syntax-string">{currentWord}</span>);
          currentWord = "";
        }
        i++;
        continue;
      }

      if (char === '"' || char === "'") {
        if (currentWord) {
          tokens.push(parseWord(currentWord, lang, i));
          currentWord = "";
        }
        inString = true;
        stringChar = char;
        currentWord = char;
        i++;
        continue;
      }

      // Word dividers
      if ("(){}[]+-*/%=:;,. \t<>!&|?".includes(char)) {
        if (currentWord) {
          tokens.push(parseWord(currentWord, lang, i));
          currentWord = "";
        }
        tokens.push(<span key={`divider-${i}`} className="syntax-divider">{char}</span>);
      } else {
        currentWord += char;
      }
      i++;
    }

    if (currentWord) {
      tokens.push(parseWord(currentWord, lang, i));
    }

    return <>{tokens}</>;
  };

  const parseWord = (word: string, lang: string, index: number): React.ReactNode => {
    // Number check
    if (/^\d+$/.test(word)) {
      return <span key={index} className="syntax-number">{word}</span>;
    }

    const pythonKeywords = ["def", "class", "import", "from", "return", "if", "elif", "else", "try", "except", "finally", "in", "not", "and", "or", "pass", "yield", "as"];
    const jsKeywords = ["const", "let", "var", "function", "export", "import", "default", "from", "return", "if", "else", "try", "catch", "finally", "class", "interface", "type", "extends", "implements", "as", "new", "true", "false", "null", "undefined"];

    const isKeyword =
      lang === "python"
        ? pythonKeywords.includes(word)
        : jsKeywords.includes(word);

    if (isKeyword) {
      return <span key={index} className="syntax-keyword">{word}</span>;
    }

    // Builtins / Function calls
    if (word[0] === word[0].toUpperCase() && isNaN(Number(word[0]))) {
      return <span key={index} className="syntax-type">{word}</span>;
    }

    return <span key={index} className="syntax-text">{word}</span>;
  };

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
        <span className="code-viewer-meta">
          {lines.length} lines · {language.toUpperCase()} · Read Only
        </span>
      </div>

      {/* Code viewport with line numbers */}
      <div className="code-viewer-viewport">
        <div className="code-viewer-gutter">
          {lines.map((_, idx) => (
            <div key={idx + 1} className="gutter-line-number">
              {idx + 1}
            </div>
          ))}
        </div>
        <div className="code-viewer-content">
          {lines.map((line, idx) => (
            <div key={idx} className="code-line">
              {tokenizeLine(line, language)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
