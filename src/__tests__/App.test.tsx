/**
 * Test: file upload handlers are properly wired in App.tsx
 *
 * Bug: onChange handlers on file inputs contain empty comments instead
 * of calling useFileUpload().handleFileUpload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReconciliationProvider } from '../context/ReconciliationContext';

// Mock useFileUpload so we can verify it gets wired to the inputs
const mockHandleFileUpload = vi.fn();
const mockHandlePasteImport = vi.fn();

vi.mock('../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    handleFileUpload: mockHandleFileUpload,
    handlePasteImport: mockHandlePasteImport,
  }),
}));

import App from '../App';

describe('App file upload wiring', () => {
  beforeEach(() => {
    mockHandleFileUpload.mockClear();
    mockHandlePasteImport.mockClear();
  });

  it('calls handleFileUpload when Source A file input changes', () => {
    const { container } = render(
      <ReconciliationProvider>
        <App />
      </ReconciliationProvider>
    );

    const input = container.querySelector('#source-A-uploader') as HTMLInputElement;
    expect(input).not.toBeNull();

    const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    // BUG: this fails because onChange is an empty comment
    expect(mockHandleFileUpload).toHaveBeenCalledTimes(1);
  });

  it('calls handleFileUpload when Source B file input changes', () => {
    const { container } = render(
      <ReconciliationProvider>
        <App />
      </ReconciliationProvider>
    );

    const input = container.querySelector('#source-B-uploader') as HTMLInputElement;
    expect(input).not.toBeNull();

    const file = new File(['x,y\n3,4'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockHandleFileUpload).toHaveBeenCalledTimes(1);
  });

  it('calls handlePasteImport when Source A paste button is clicked', () => {
    const { container } = render(
      <ReconciliationProvider>
        <App />
      </ReconciliationProvider>
    );

    // Switch to paste tab in Source A
    const pasteButtons = screen.getAllByText('Ctrl+V Paste');
    fireEvent.click(pasteButtons[0]);

    // Click parse button inside Source A card
    const sourceA = container.querySelector('#import-block-A') as HTMLElement;
    const parseBtn = within(sourceA).getByText('Parse Paste Text');
    fireEvent.click(parseBtn);

    expect(mockHandlePasteImport).toHaveBeenCalledTimes(1);
  });

  it('calls handlePasteImport when Source B paste button is clicked', () => {
    const { container } = render(
      <ReconciliationProvider>
        <App />
      </ReconciliationProvider>
    );

    // Switch to paste tab in Source B
    const pasteButtons = screen.getAllByText('Ctrl+V Paste');
    fireEvent.click(pasteButtons[1]);

    // Click parse button inside Source B card
    const sourceB = container.querySelector('#import-block-B') as HTMLElement;
    const parseBtn = within(sourceB).getByText('Parse Paste Text');
    fireEvent.click(parseBtn);

    expect(mockHandlePasteImport).toHaveBeenCalledTimes(1);
  });
});
