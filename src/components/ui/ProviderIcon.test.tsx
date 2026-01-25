/**
 * @file ProviderIcon.test.tsx
 * @description Testes para o componente ProviderIcon
 * @version 1.38.49
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProviderIcon } from './ProviderIcon';
import type { AIProvider } from '../../types';

describe('ProviderIcon', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('should render Claude icon when provider is claude', () => {
      const { container } = render(<ProviderIcon provider="claude" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
    });

    it('should render Gemini icon when provider is gemini', () => {
      const { container } = render(<ProviderIcon provider="gemini" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should render OpenAI icon when provider is openai', () => {
      const { container } = render(<ProviderIcon provider="openai" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should render Grok icon when provider is grok', () => {
      const { container } = render(<ProviderIcon provider="grok" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('should render null for unknown provider', () => {
      const { container } = render(<ProviderIcon provider={'unknown' as AIProvider} />);

      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIZE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Size', () => {
    it('should use default size of 20', () => {
      const { container } = render(<ProviderIcon provider="claude" />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('20');
      expect(svg?.getAttribute('height')).toBe('20');
    });

    it('should use custom size when provided', () => {
      const { container } = render(<ProviderIcon provider="claude" size={32} />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('32');
      expect(svg?.getAttribute('height')).toBe('32');
    });

    it('should apply size to gemini icon', () => {
      const { container } = render(<ProviderIcon provider="gemini" size={16} />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('16');
      expect(svg?.getAttribute('height')).toBe('16');
    });

    it('should apply size to openai icon', () => {
      const { container } = render(<ProviderIcon provider="openai" size={24} />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('24');
      expect(svg?.getAttribute('height')).toBe('24');
    });

    it('should apply size to grok icon', () => {
      const { container } = render(<ProviderIcon provider="grok" size={48} />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('48');
      expect(svg?.getAttribute('height')).toBe('48');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSNAME TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ClassName', () => {
    it('should apply custom className to Claude icon', () => {
      const { container } = render(<ProviderIcon provider="claude" className="text-orange-500" />);

      const svg = container.querySelector('svg');
      expect(svg?.className.baseVal).toContain('text-orange-500');
    });

    it('should apply custom className to Gemini icon', () => {
      const { container } = render(<ProviderIcon provider="gemini" className="text-blue-500" />);

      const svg = container.querySelector('svg');
      expect(svg?.className.baseVal).toContain('text-blue-500');
    });

    it('should apply custom className to OpenAI icon', () => {
      const { container } = render(<ProviderIcon provider="openai" className="text-green-500" />);

      const svg = container.querySelector('svg');
      expect(svg?.className.baseVal).toContain('text-green-500');
    });

    it('should apply custom className to Grok icon', () => {
      const { container } = render(<ProviderIcon provider="grok" className="text-white" />);

      const svg = container.querySelector('svg');
      expect(svg?.className.baseVal).toContain('text-white');
    });

    it('should render without className when not provided', () => {
      const { container } = render(<ProviderIcon provider="claude" />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG CONTENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('SVG Content', () => {
    it('should have path element in Claude icon', () => {
      const { container } = render(<ProviderIcon provider="claude" />);

      const path = container.querySelector('svg path');
      expect(path).toBeInTheDocument();
    });

    it('should have path element in Gemini icon', () => {
      const { container } = render(<ProviderIcon provider="gemini" />);

      const path = container.querySelector('svg path');
      expect(path).toBeInTheDocument();
    });

    it('should have path element in OpenAI icon', () => {
      const { container } = render(<ProviderIcon provider="openai" />);

      const path = container.querySelector('svg path');
      expect(path).toBeInTheDocument();
    });

    it('should have path element in Grok icon', () => {
      const { container } = render(<ProviderIcon provider="grok" />);

      const path = container.querySelector('svg path');
      expect(path).toBeInTheDocument();
    });

    it('should use fill="currentColor" in all icons', () => {
      const providers: AIProvider[] = ['claude', 'gemini', 'openai', 'grok'];

      providers.forEach((provider) => {
        const { container } = render(<ProviderIcon provider={provider} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('fill')).toBe('currentColor');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTINCT ICONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Distinct Icons', () => {
    it('should render different SVG paths for different providers', () => {
      const { container: claudeContainer } = render(<ProviderIcon provider="claude" />);
      const { container: geminiContainer } = render(<ProviderIcon provider="gemini" />);

      const claudePath = claudeContainer.querySelector('svg path')?.getAttribute('d');
      const geminiPath = geminiContainer.querySelector('svg path')?.getAttribute('d');

      expect(claudePath).not.toBe(geminiPath);
    });

    it('should render Claude with 16x16 viewBox (unique)', () => {
      const { container } = render(<ProviderIcon provider="claude" />);

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
    });

    it('should render non-Claude providers with 24x24 viewBox', () => {
      const providers: AIProvider[] = ['gemini', 'openai', 'grok'];

      providers.forEach((provider) => {
        const { container } = render(<ProviderIcon provider={provider} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
      });
    });
  });
});
