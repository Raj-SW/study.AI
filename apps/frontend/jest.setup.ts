// jsdom does not implement scrollIntoView (used by ChatPanel auto-scroll).
window.HTMLElement.prototype.scrollIntoView = jest.fn();
