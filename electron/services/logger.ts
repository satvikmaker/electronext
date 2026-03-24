import log from 'electron-log/main.js';

export function initializeLogger(): void {
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';
  log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
}

export default log;
