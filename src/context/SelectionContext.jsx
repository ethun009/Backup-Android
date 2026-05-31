import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

const SelectionContext = createContext(null);

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── Reducer ────────────────────────────────────────────────

const initialState = {
  // Map of filePath → { name, path, size, folderPath }
  selectedFiles: {},
  // Set of folderPaths that are fully selected
  selectedFolders: new Set(),
};

function selectionReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_FILE': {
      const { file } = action.payload;
      const next = { ...state.selectedFiles };
      if (next[file.path]) {
        delete next[file.path];
      } else {
        next[file.path] = file;
      }
      return { ...state, selectedFiles: next };
    }

    case 'SELECT_FOLDER': {
      const { folderPath, files } = action.payload;
      const next = { ...state.selectedFiles };
      for (const f of files) {
        next[f.path] = f;
      }
      const nextFolders = new Set(state.selectedFolders);
      nextFolders.add(folderPath);
      return { ...state, selectedFiles: next, selectedFolders: nextFolders };
    }

    case 'DESELECT_FOLDER': {
      const { folderPath, files } = action.payload;
      const next = { ...state.selectedFiles };
      for (const f of files) {
        delete next[f.path];
      }
      const nextFolders = new Set(state.selectedFolders);
      nextFolders.delete(folderPath);
      return { ...state, selectedFiles: next, selectedFolders: nextFolders };
    }

    case 'CLEAR_ALL':
      return { selectedFiles: {}, selectedFolders: new Set() };

    default:
      return state;
  }
}

// ── Provider ───────────────────────────────────────────────

export function SelectionProvider({ children }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  const toggleFile = useCallback((file) => {
    dispatch({ type: 'TOGGLE_FILE', payload: { file } });
  }, []);

  const selectFolder = useCallback((folderPath, files) => {
    dispatch({ type: 'SELECT_FOLDER', payload: { folderPath, files } });
  }, []);

  const deselectFolder = useCallback((folderPath, files) => {
    dispatch({ type: 'DESELECT_FOLDER', payload: { folderPath, files } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const isFileSelected = useCallback((filePath) => {
    return !!state.selectedFiles[filePath];
  }, [state.selectedFiles]);

  const isFolderSelected = useCallback((folderPath) => {
    return state.selectedFolders.has(folderPath);
  }, [state.selectedFolders]);

  // Derived totals
  const summary = useMemo(() => {
    const files = Object.values(state.selectedFiles);
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      totalFiles: files.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
    };
  }, [state.selectedFiles]);

  const value = {
    selectedFiles: state.selectedFiles,
    selectedFolders: state.selectedFolders,
    toggleFile,
    selectFolder,
    deselectFolder,
    clearAll,
    isFileSelected,
    isFolderSelected,
    summary,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within <SelectionProvider>');
  return ctx;
}
