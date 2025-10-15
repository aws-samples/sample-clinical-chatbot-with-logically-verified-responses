import '@testing-library/jest-dom';

// Mock scrollTo for testing
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: function(options: ScrollToOptions | number, y?: number) {
    if (typeof options === 'object') {
      this.scrollTop = options.top || 0;
      this.scrollLeft = options.left || 0;
    } else {
      this.scrollTop = y || 0;
      this.scrollLeft = options || 0;
    }
  },
  writable: true,
});