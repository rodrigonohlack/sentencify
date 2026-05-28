/**
 * @file EditableProcessNumber.test.tsx
 * @description Testes do subcomponente de rename inline.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableProcessNumber } from './EditableProcessNumber';

describe('EditableProcessNumber', () => {
  it('shows the number with a pencil button when canEdit=true', () => {
    render(
      <EditableProcessNumber
        value="0001234-56.2024.5.08.0001"
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('0001234-56.2024.5.08.0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /renomear/i })).toBeInTheDocument();
  });

  it('hides the pencil button when canEdit=false', () => {
    render(
      <EditableProcessNumber
        value="0001234-56.2024.5.08.0001"
        canEdit={false}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /renomear/i })).not.toBeInTheDocument();
  });

  it('shows fallback when value is null', () => {
    render(
      <EditableProcessNumber
        value={null}
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Processo não identificado')).toBeInTheDocument();
  });

  it('enters edit mode on pencil click and focuses input', () => {
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('ABC-1');
    expect(document.activeElement).toBe(input);
  });

  it('calls onSave with trimmed value when Enter is pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  NEW-2  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('NEW-2');
    });
  });

  it('calls onSave(null) when input is emptied and Enter pressed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null);
    });
  });

  it('does NOT call onSave when Escape is pressed', () => {
    const onSave = vi.fn();
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'NEW' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('ABC-1')).toBeInTheDocument();
  });

  it('does NOT call onSave when value is unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableProcessNumber
        value="ABC-1"
        canEdit={true}
        isSelected={false}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    // microtask flush
    await Promise.resolve();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stops propagation of pencil click', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <EditableProcessNumber
          value="ABC-1"
          canEdit={true}
          isSelected={false}
          onSave={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /renomear/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
