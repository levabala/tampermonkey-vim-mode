import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Vim Mode Integration Tests', () => {
  let input, textarea, getIndicator;
  let scriptLoaded = false;

  beforeEach(() => {
    // Load and execute the userscript only once (before clearing body)
    if (!scriptLoaded) {
      const scriptPath = join(__dirname, '..', 'tampermonkey_vim_mode.js');
      const scriptContent = readFileSync(scriptPath, 'utf-8');
      // Remove userscript metadata and execute
      const codeOnly = scriptContent.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n/, '');
      eval(codeOnly);
      scriptLoaded = true;
    }

    // Remove only test elements, not the indicator
    const oldInput = document.getElementById('test-input');
    const oldTextarea = document.getElementById('test-textarea');
    if (oldInput) oldInput.remove();
    if (oldTextarea) oldTextarea.remove();

    // Create test elements
    input = document.createElement('input');
    input.id = 'test-input';
    document.body.appendChild(input);

    textarea = document.createElement('textarea');
    textarea.id = 'test-textarea';
    document.body.appendChild(textarea);

    // Helper to get mode indicator
    getIndicator = () => document.querySelector('div[style*="position: fixed"]');
  });

  afterEach(() => {
    // Clean up inputs but keep event listeners
    if (input && input.parentNode) {
      input.blur();
      input.remove();
    }
    if (textarea && textarea.parentNode) {
      textarea.blur();
      textarea.remove();
    }
  });

  describe('Mode Switching', () => {
    it('should start in insert mode when input is focused', () => {
      input.focus();
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });

    it('should switch to normal mode on Escape', () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- NORMAL --');
    });

    it('should switch to normal mode on Ctrl-]', () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ']', ctrlKey: true, bubbles: true }));
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- NORMAL --');
    });

    it('should remain in normal mode after Escape even if focusin fires', () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(getIndicator().textContent).toBe('-- NORMAL --');

      // Simulate a focusin event (which might happen due to blur prevention logic)
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // Should still be in normal mode
      expect(getIndicator().textContent).toBe('-- NORMAL --');
    });

    it('should switch to normal mode when pressing Escape twice', () => {
      input.focus();
      expect(getIndicator().textContent).toBe('-- INSERT --');

      // First Escape - should switch to normal mode
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(getIndicator().textContent).toBe('-- NORMAL --');

      // Simulate the focusin event that happens due to blur prevention
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      // Second Escape - should stay in normal mode (not switch back to insert)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(getIndicator().textContent).toBe('-- NORMAL --');
    });

    it('should switch back to insert mode with i', () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });
  });

  describe('Basic Motions', () => {
    it('should move cursor right with l', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Cursor stays at 0 after escape (no movement on empty line start)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
      expect(input.selectionStart).toBe(1);
    });

    it('should move cursor left with h', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 2;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Cursor stays at 2 (not at end of line)
      expect(input.selectionStart).toBe(2);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
      expect(input.selectionStart).toBe(1);
    });

    it('should move to start of line with 0', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 5;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      expect(input.selectionStart).toBe(0);
    });

    it('should move to end of line with $', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '$', bubbles: true }));
      expect(input.selectionStart).toBe(5);
    });

    it('should move forward by word with w', () => {
      input.value = 'hello world test';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Cursor stays at 0
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.selectionStart).toBe(6);
    });

    it('should move backward by word with b', () => {
      input.value = 'hello world test';
      input.focus();
      input.selectionStart = 12;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Cursor stays at 12 (not at end)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
      expect(input.selectionStart).toBe(6);
    });
  });

  describe('Operators - Delete', () => {
    it('should delete character with x', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      expect(input.value).toBe('ello');
    });

    it('should delete word with dw', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.value).toBe('world');
    });

    it('should delete line with dd', () => {
      textarea.value = 'line1\nline2\nline3';
      textarea.focus();
      textarea.selectionStart = 7; // on line2
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Cursor moves back to 6
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      expect(textarea.value).toBe('line1\nline3');
    });

    it('should delete to end of line with d$', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 6;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '$', bubbles: true }));
      expect(input.value).toBe('hello ');
    });
  });

  describe('Yank and Paste', () => {
    it('should yank and paste word with yw and p', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Yank word
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      // Move to end
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '$', bubbles: true }));
      // Paste once
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
      expect(input.value).toBe('hello worldhello ');
    });
  });

  describe('Insert Commands', () => {
    it('should insert at end of line with A', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      expect(input.selectionStart).toBe(5);
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });

    it('should insert at start of line with I', () => {
      input.value = '  hello';
      input.focus();
      input.selectionStart = 5;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'I', bubbles: true }));
      expect(input.selectionStart).toBe(2); // first non-blank
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });

    it('should open line below with o', () => {
      textarea.value = 'line1\nline2';
      textarea.focus();
      textarea.selectionStart = 1;
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Press o once
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }));
      expect(textarea.value).toBe('line1\n\nline2');
      expect(textarea.selectionStart).toBe(6);
    });

    it('should open line above with O', () => {
      textarea.value = 'line1\nline2';
      textarea.focus();
      textarea.selectionStart = 7; // on line2
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Press O once
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'O', bubbles: true }));
      expect(textarea.value).toBe('line1\n\nline2');
      expect(textarea.selectionStart).toBe(6);
    });
  });

  describe('Text Objects', () => {
    it('should delete inside parentheses with di(', () => {
      input.value = 'foo(bar)baz';
      input.focus();
      input.selectionStart = 5; // inside parens
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '(', bubbles: true }));
      expect(input.value).toBe('foo()baz');
    });

    it('should delete around quotes with da"', () => {
      input.value = 'foo"bar"baz';
      input.focus();
      input.selectionStart = 5; // inside quotes
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '"', bubbles: true }));
      expect(input.value).toBe('foobaz');
    });
  });

  describe('Undo/Redo', () => {
    it('should undo with u', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      expect(input.value).toBe('ello');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }));
      expect(input.value).toBe('hello');
    });

    it('should redo with Ctrl-r', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true }));
      expect(input.value).toBe('ello');
    });
  });

  describe('Counts', () => {
    it('should repeat motion with count 3l', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
      expect(input.selectionStart).toBe(3);
    });

    it('should repeat delete with count 2x', () => {
      input.value = 'hello';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      expect(input.value).toBe('llo');
    });

    it('should delete multiple words with 2dw', () => {
      input.value = 'one two three four';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.value).toBe('three four');
    });
  });

  describe('Character Finding', () => {
    it('should find character with f', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.selectionStart).toBe(6);
    });

    it('should find till character with t', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.selectionStart).toBe(5);
    });

    it('should repeat find with ;', () => {
      input.value = 'hello world wow';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }));
      expect(input.selectionStart).toBe(4);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ';', bubbles: true }));
      expect(input.selectionStart).toBe(7);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ';', bubbles: true }));
      expect(input.selectionStart).toBe(13);
    });
  });

  describe('Multiline Operations', () => {
    it('should move down with j', () => {
      textarea.value = 'line1\nline2\nline3';
      textarea.focus();
      textarea.selectionStart = 0;
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
      expect(textarea.selectionStart).toBe(6);
    });

    it('should move up with k', () => {
      textarea.value = 'line1\nline2\nline3';
      textarea.focus();
      textarea.selectionStart = 6; // line2
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
      expect(textarea.selectionStart).toBe(0);
    });

    it('should go to first line with gg', () => {
      textarea.value = 'line1\nline2\nline3';
      textarea.focus();
      textarea.selectionStart = 12; // line3
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      expect(textarea.selectionStart).toBe(0);
    });

    it('should go to last line with G', () => {
      textarea.value = 'line1\nline2\nline3';
      textarea.focus();
      textarea.selectionStart = 0;
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'G', bubbles: true }));
      expect(textarea.selectionStart).toBe(17);
    });
  });

  describe('Change Operator', () => {
    it('should change word with cw', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.value).toBe('world');
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });

    it('should change inside parentheses with ci(', () => {
      input.value = 'foo(bar)baz';
      input.focus();
      input.selectionStart = 5;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '(', bubbles: true }));
      expect(input.value).toBe('foo()baz');
      const indicator = getIndicator();
      expect(indicator.textContent).toBe('-- INSERT --');
    });
  });

  describe('Dot Repeat', () => {
    it('should repeat last change with .', () => {
      input.value = 'hello world';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
      expect(input.value).toBe('ello world');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '.', bubbles: true }));
      expect(input.value).toBe('llo world');
    });

    it('should repeat delete word with .', () => {
      input.value = 'one two three four';
      input.focus();
      input.selectionStart = 0;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
      expect(input.value).toBe('two three four');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '.', bubbles: true }));
      expect(input.value).toBe('three four');
    });
  });
});
