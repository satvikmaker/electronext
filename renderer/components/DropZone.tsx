'use client';

import { useState, useCallback, type DragEvent } from 'react';
import type { FileMetadata } from '../../electron/ipc/schema';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const bridge = window.electron;
    if (!bridge) return;

    // `File.path` was removed in Electron 32 — webUtils.getPathForFile is the
    // replacement, bridged through the preload.
    const paths = Array.from(e.dataTransfer.files).map((f) => bridge.getPathForFile(f));
    if (paths.length === 0) return;

    setFiles(await bridge.ipc.invoke('file:get-metadata', paths));
  }, []);

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-text">File Drop Zone</h2>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="File drop zone"
        tabIndex={0}
        className={`flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
          isDragging
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-surface-light text-text-muted'
        }`}
      >
        <p className="text-sm">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f) => (
            <div
              key={f.path}
              className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2 text-sm"
            >
              <span className="truncate text-text">{f.name}</span>
              <span className="ml-2 shrink-0 text-xs text-text-muted">
                {f.isDirectory ? 'Folder' : formatBytes(f.size)}
              </span>
            </div>
          ))}
          <button
            onClick={() => setFiles([])}
            className="text-xs text-text-muted transition-colors hover:text-text"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
