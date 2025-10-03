import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let scriptLoaded = false;

export function setupVimMode() {
  if (!scriptLoaded) {
    const scriptPath = join(__dirname, '..', '..', 'tampermonkey_vim_mode.js');
    const scriptContent = readFileSync(scriptPath, 'utf-8');
    // Remove userscript metadata and execute
    const codeOnly = scriptContent.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n/, '');
    eval(codeOnly);
    scriptLoaded = true;
  }
}

export function createTestElements() {
  // Remove only test elements, not the indicator
  const oldInput = document.getElementById('test-input');
  const oldTextarea = document.getElementById('test-textarea');
  if (oldInput) oldInput.remove();
  if (oldTextarea) oldTextarea.remove();

  // Create test elements
  const input = document.createElement('input');
  input.id = 'test-input';
  document.body.appendChild(input);

  const textarea = document.createElement('textarea');
  textarea.id = 'test-textarea';
  document.body.appendChild(textarea);

  return { input, textarea };
}

export function cleanupTestElements(input, textarea) {
  if (input && input.parentNode) {
    input.blur();
    input.remove();
  }
  if (textarea && textarea.parentNode) {
    textarea.blur();
    textarea.remove();
  }
}

export function getIndicator() {
  return document.querySelector('div[style*="position: fixed"]');
}

export function getModeText() {
  const indicator = getIndicator();
  return indicator?.children[0]?.textContent || '';
}
