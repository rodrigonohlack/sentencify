/**
 * @file ChatGroundingFooter.test.tsx
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatGroundingFooter } from './ChatGroundingFooter';
import type { GroundingMetadata } from '../../types';

describe('ChatGroundingFooter', () => {
  // Simula produção para safeHref rejeitar http://
  const originalLocation = window.location;
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, hostname: 'sentencify.ia.br' },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('não renderiza quando não há chunks', () => {
    const { container } = render(<ChatGroundingFooter metadata={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza quando chunks estão vazios', () => {
    const { container } = render(<ChatGroundingFooter metadata={{ groundingChunks: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it('mostra contagem no singular para 1 fonte', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [{ web: { uri: 'https://tst.jus.br/sumula', title: 'Súmula TST' } }],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    expect(screen.getByText(/1 fonte consultada/)).toBeInTheDocument();
  });

  it('mostra contagem no plural para múltiplas fontes', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        { web: { uri: 'https://a.com/1', title: 'A' } },
        { web: { uri: 'https://b.com/2', title: 'B' } },
        { web: { uri: 'https://c.com/3', title: 'C' } },
      ],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    expect(screen.getByText(/3 fontes consultadas/)).toBeInTheDocument();
  });

  it('lista colapsada inicialmente; expande ao clicar', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        { web: { uri: 'https://tst.jus.br/a', title: 'Fonte A' } },
        { web: { uri: 'https://jusbrasil.com.br/b', title: 'Fonte B' } },
      ],
    };
    render(<ChatGroundingFooter metadata={metadata} />);

    // Antes de expandir: links não devem estar renderizados
    expect(screen.queryByText('Fonte A')).not.toBeInTheDocument();

    // Botão tem aria-expanded="false"
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Expandir
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Fonte A')).toBeInTheDocument();
    expect(screen.getByText('Fonte B')).toBeInTheDocument();
  });

  it('renderiza hostname ao lado do título', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [{ web: { uri: 'https://www.tst.jus.br/path', title: 'Súmula' } }],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/\(tst\.jus\.br\)/)).toBeInTheDocument();
  });

  it('neutraliza href javascript: (safeHref)', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        { web: { uri: 'javascript:alert(1)', title: 'Malicioso' } },
      ],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    fireEvent.click(screen.getByRole('button'));
    const link = screen.getByRole('link', { name: /Malicioso/ });
    expect(link).toHaveAttribute('href', '#');
  });

  it('links têm target=_blank e rel=noopener noreferrer', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        { web: { uri: 'https://tst.jus.br/x', title: 'T' } },
      ],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    fireEvent.click(screen.getByRole('button'));
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('link tem aria-label explicando que abre em nova aba', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [{ web: { uri: 'https://tst.jus.br', title: 'Súmula 347' } }],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    fireEvent.click(screen.getByRole('button'));
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-label')).toContain('Súmula 347');
    expect(link.getAttribute('aria-label')).toContain('nova aba');
  });

  it('filtra chunks sem uri ou title válidos', () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        { web: { uri: 'https://ok.com', title: 'OK' } },
        { web: { uri: '', title: 'Sem URL' } },
        // @ts-expect-error — simular chunk mal formado
        { other: 'invalid' },
      ],
    };
    render(<ChatGroundingFooter metadata={metadata} />);
    expect(screen.getByText(/1 fonte consultada/)).toBeInTheDocument();
  });
});
