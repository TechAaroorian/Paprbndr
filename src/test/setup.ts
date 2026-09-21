import '@testing-library/jest-dom/vitest';

// Polyfill window.print if not available in jsdom
if (!window.print) {
  window.print = () => {};
}

// Polyfill scrollIntoView if not available in jsdom
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
