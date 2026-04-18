/**
 * @file EditorWidthDropdown.tsx
 * @description Controle de largura do editor em tela cheia
 * @version 1.41.17
 */

import React from 'react';
import { EDITOR_WIDTH_PRESETS } from '../../constants/presets';

export interface EditorWidthDropdownProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export const EditorWidthDropdown = React.memo(({
  value,
  onChange,
  ariaLabel = 'Largura do editor'
}: EditorWidthDropdownProps) => {
  const themeClasses = {
    select: 'theme-bg-secondary theme-text-primary theme-border-input',
    option: 'theme-bg-secondary theme-text-primary'
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-2 py-1 border rounded text-sm cursor-pointer hover-border-blue-500 transition-colors ${themeClasses.select}`}
        aria-label={ariaLabel}
        title="Largura do editor em tela cheia"
      >
        {Object.entries(EDITOR_WIDTH_PRESETS).map(([key, preset]) => (
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

EditorWidthDropdown.displayName = 'EditorWidthDropdown';
