import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableOfContents } from '../components/markdown/TableOfContents';
import type { TocItem } from '../services/markdownPdfService';

describe('TableOfContents Component', () => {
  const mockItems: TocItem[] = [
    { id: 'executive-summary', title: '1. Executive Summary', level: 1 },
    { id: 'core-architecture', title: '2. Core Architecture', level: 2 },
    { id: 'performance-benchmarks', title: '3. Performance Benchmarks', level: 2 },
  ];

  it('renders all headings when open', () => {
    render(
      <TableOfContents
        items={mockItems}
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText('Document Outline')).toBeInTheDocument();
    expect(screen.getByText('1. Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('2. Core Architecture')).toBeInTheDocument();
    expect(screen.getByText('3. Performance Benchmarks')).toBeInTheDocument();
  });

  it('renders a floating toggle button when closed', () => {
    const handleToggle = vi.fn();
    render(
      <TableOfContents
        items={mockItems}
        isOpen={false}
        onToggle={handleToggle}
      />
    );

    const toggleBtn = screen.getByTitle('Open Table of Contents (Outline)');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('highlights the active heading item when activeId matches', () => {
    render(
      <TableOfContents
        items={mockItems}
        isOpen={true}
        onToggle={vi.fn()}
        activeId="core-architecture"
      />
    );

    const activeItem = screen.getByText('2. Core Architecture').closest('button');
    expect(activeItem).toHaveClass('active');

    const nonActiveItem = screen.getByText('1. Executive Summary').closest('button');
    expect(nonActiveItem).not.toHaveClass('active');
  });

  it('calls scrollIntoView when an item is clicked', () => {
    const headingEl = document.createElement('div');
    headingEl.id = 'executive-summary';
    document.body.appendChild(headingEl);

    const scrollIntoViewMock = vi.fn();
    headingEl.scrollIntoView = scrollIntoViewMock;

    render(
      <TableOfContents
        items={mockItems}
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    const itemBtn = screen.getByText('1. Executive Summary');
    fireEvent.click(itemBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    document.body.removeChild(headingEl);
  });

  it('shows empty outline state when no headings are provided', () => {
    render(
      <TableOfContents
        items={[]}
        isOpen={true}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/No headings detected/i)).toBeInTheDocument();
  });
});
