/**
 * @file index.ts
 * @description Barrel export para componentes de editor
 * @version 1.36.94
 */

// Quill Editors
export {
  getQuillToolbarConfig,
  QuillEditorBase,
  QuillModelEditor,
  QuillDecisionEditor,
  QuillMiniRelatorioEditor,
  AIRegenerationSection
} from './QuillEditors';

// Field Editor
export { FieldEditor, InlineFormattingToolbar } from './FieldEditor';

// Editor Containers (v1.36.97)
export { GlobalEditorSection } from './GlobalEditorSection';
export { DecisionEditorContainer } from './DecisionEditorContainer';
