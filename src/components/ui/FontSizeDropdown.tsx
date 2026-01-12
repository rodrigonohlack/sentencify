/**
 * @file FontSizeDropdown.tsx
 * @description Controle de tamanho de fonte
 * @version 1.36.82
 */

import React from 'react';
import { FONTSIZE_PRESETS } from '../../constants/presets';

export interface FontSizeDropdownProps {
  value: 'small' | 'normal' | 'large';
  onChange: (value: 'small' | 'normal' | 'large') => void;
  ariaLabel?: string;
}

export const FontSizeDropdown = React.memo(({
  value,
  onChange,
  ariaLabel = 'Tamanho da fonte'
}: FontSizeDropdownProps) => {
  const themeClasses = {
    select: 'theme-bg-secondary theme-text-primary theme-border-input',
    option: 'theme-bg-secondary theme-text-primary'
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'small' | 'normal' | 'large')}
        className={`px-2 py-1 border rounded text-sm cursor-pointer hover-border-blue-500 transition-colors ${themeClasses.select}`}
        aria-label={ariaLabel}
        title="Tamanho da fonte do editor"
      >
        {Object.entries(FONTSIZE_PRESETS).map(([key, preset]) => (
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

FontSizeDropdown.displayName = 'FontSizeDropdown';
