/**
 * @file SpacingDropdown.tsx
 * @description Controle de espaçamento de parágrafos
 * @version 1.36.82
 */

import React from 'react';
import { SPACING_PRESETS } from '../../constants/presets';
import type { SpacingDropdownProps } from '../../types';

export type { SpacingDropdownProps };

export const SpacingDropdown = React.memo(({
  value,
  onChange,
  ariaLabel = 'Espaçamento de parágrafo'
}: SpacingDropdownProps) => {
  const themeClasses = {
    select: 'theme-bg-secondary theme-text-primary theme-border-input',
    option: 'theme-bg-secondary theme-text-primary'
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'compact' | 'normal' | 'wide')}
        className={`px-2 py-1 border rounded text-sm cursor-pointer hover-border-blue-500 transition-colors ${themeClasses.select}`}
        aria-label={ariaLabel}
        title="Espaçamento entre linhas e parágrafos"
      >
        {Object.entries(SPACING_PRESETS).map(([key, preset]) => (
          <option
            key={key}
            value={key}
            className={themeClasses.option}
          >
            {preset.icon} {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
});

SpacingDropdown.displayName = 'SpacingDropdown';
