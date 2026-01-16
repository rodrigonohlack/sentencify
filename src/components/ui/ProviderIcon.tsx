/**
 * @file ProviderIcon.tsx
 * @description Ícones SVG dos provedores de IA (Claude, Gemini, OpenAI, Grok)
 * @version 1.37.71
 */

import React from 'react';
import type { AIProvider } from '../../types';

interface ProviderIconProps {
  provider: AIProvider;
  size?: number;
  className?: string;
}

/**
 * Ícone do Claude (Anthropic) - Logo característico
 */
const ClaudeIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Logo Anthropic/Claude - símbolo estilizado */}
    <path d="M17.304 3.016c-.293-.051-.621.08-.772.292L12 11.172 7.468 3.308c-.15-.212-.479-.343-.772-.292-.293.05-.522.242-.596.498L3.096 20.18c-.074.255.024.51.255.664.23.154.56.145.856-.022l4.3-2.433 3.135 2.575c.132.108.3.162.466.162.167 0 .334-.054.466-.162l3.135-2.575 4.3 2.433c.296.167.625.176.856.022.23-.154.329-.409.255-.664L18.116 3.514c-.074-.256-.303-.448-.596-.498h-.216zM12 14.73l-2.578-2.117L12 6.79l2.578 5.822L12 14.73z" />
  </svg>
);

/**
 * Ícone do Gemini (Google) - Estrela/Sparkle
 */
const GeminiIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Gemini sparkle/star icon */}
    <path d="M12 2C12 2 12.89 5.58 14.12 7.88C15.35 10.18 18 12 18 12C18 12 15.35 13.82 14.12 16.12C12.89 18.42 12 22 12 22C12 22 11.11 18.42 9.88 16.12C8.65 13.82 6 12 6 12C6 12 8.65 10.18 9.88 7.88C11.11 5.58 12 2 12 2Z" />
  </svg>
);

/**
 * Ícone do OpenAI - Logo hexagonal/flor
 */
const OpenAIIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* OpenAI logo - hexagon flower pattern */}
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681v6.722zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

/**
 * Ícone do Grok (xAI) - Logo X
 */
const GrokIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* X/Twitter logo - usado pelo xAI/Grok */}
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * Componente principal que renderiza o ícone do provedor
 */
export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, size = 20, className }) => {
  switch (provider) {
    case 'claude':
      return <ClaudeIcon size={size} className={className} />;
    case 'gemini':
      return <GeminiIcon size={size} className={className} />;
    case 'openai':
      return <OpenAIIcon size={size} className={className} />;
    case 'grok':
      return <GrokIcon size={size} className={className} />;
    default:
      return null;
  }
};

export default ProviderIcon;
