import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { getIconForNode, FOLDER_ICON_SMALL, getDisplayName } from '../../../context/vfsConstants';
import { normalizePath, getExtension, formatFileSize } from '../../../context/vfsUtils';

import search from 'assets/windowsIcons/299(32x32).png';

/**
 * Search panel for My Computer file explorer.
 * Searches by filename recursively from the current directory.
 */
export default function SearchPanel({ vfs, currentPath, onNavigate, onOpenFile, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(() => {
    if (!query.trim() || currentPath === 'My Computer') return;
    setSearching(true);

    const searchRoot = normalizePath(currentPath);
    const lowerQuery = query.toLowerCase();
    const found = [];

    // Search all entries in the VFS map that are under searchRoot
    for (const [key, node] of vfs.fs) {
      if (key === searchRoot) continue;
      if (!key.startsWith(searchRoot + '/')) continue;
      const displayName = getDisplayName(node).toLowerCase();
      if (displayName.includes(lowerQuery)) {
        found.push(node);
      }
      if (found.length >= 200) break;
    }

    setResults(found);
    setSearching(false);
  }, [query, currentPath, vfs]);

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleResultClick = node => {
    if (node.type === 'directory') {
      onNavigate(node.path);
    } else if (onOpenFile) {
      onOpenFile(node.path);
    }
  };

  return (
    <Panel>
      <div className="search__header">
        <img src={search} alt="" className="search__header-icon" />
        <span>Search Results</span>
        <button className="search__close" onClick={onClose}>&times;</button>
      </div>
      <div className="search__input-area">
        <label className="search__label">All or part of the file name:</label>
        <input
          className="search__input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter filename..."
          autoFocus
        />
        <button className="search__btn" onClick={doSearch}>Search</button>
      </div>
      {results !== null && (
        <div className="search__results">
          {results.length === 0 ? (
            <div className="search__empty">No files found matching "{query}"</div>
          ) : (
            <>
              <div className="search__count">{results.length} item(s) found</div>
              {results.map(node => (
                <div
                  key={node.path}
                  className="search__result"
                  onClick={() => handleResultClick(node)}
                  title={node.path}
                >
                  <img
                    src={node.type === 'directory' ? FOLDER_ICON_SMALL : getIconForNode(node)}
                    alt=""
                    className="search__result-icon"
                  />
                  <div className="search__result-info">
                    <span className="search__result-name">{getDisplayName(node)}</span>
                    <span className="search__result-path">{node.path}</span>
                  </div>
                  {node.type === 'file' && (
                    <span className="search__result-size">{formatFileSize(node.size || 0)}</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

const Panel = styled.div`
  width: 220px;
  flex-shrink: 0;
  background: linear-gradient(to bottom, #748aff 0%, #4057d3 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;

  .search__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: white;
    font-weight: bold;
    font-size: 12px;
  }
  .search__header-icon {
    width: 24px;
    height: 24px;
  }
  .search__close {
    margin-left: auto;
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    &:hover { background: rgba(255,255,255,0.2); border-radius: 2px; }
  }
  .search__input-area {
    padding: 8px 10px;
    background: linear-gradient(to right, rgb(180,200,251) 0%, rgb(164,185,251) 50%, rgb(180,200,251) 100%);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .search__label {
    color: #0c327d;
    font-size: 10px;
    font-weight: bold;
  }
  .search__input {
    width: 100%;
    box-sizing: border-box;
    padding: 2px 4px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    border: 1px solid #7f9db9;
  }
  .search__btn {
    align-self: flex-end;
    min-width: 60px;
    padding: 2px 8px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    background: #ece9d8;
    border: 1px solid #003c74;
    border-radius: 3px;
    cursor: pointer;
    margin-top: 4px;
    &:hover { background: #d4d0c8; }
    &:active { background: #c0bcb0; }
  }
  .search__results {
    flex: 1;
    overflow-y: auto;
    background: white;
    margin: 0 4px 4px;
    border: 1px solid #7f9db9;
  }
  .search__empty {
    padding: 10px;
    color: #808080;
    font-style: italic;
  }
  .search__count {
    padding: 4px 6px;
    color: #808080;
    border-bottom: 1px solid #e0e0e0;
  }
  .search__result {
    display: flex;
    align-items: center;
    padding: 2px 6px;
    cursor: default;
    gap: 4px;
    &:hover {
      background: rgba(49,106,197,0.1);
    }
  }
  .search__result-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
  .search__result-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .search__result-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .search__result-path {
    font-size: 9px;
    color: #808080;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .search__result-size {
    flex-shrink: 0;
    color: #808080;
    font-size: 10px;
  }
`;
