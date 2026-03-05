import { Box, CircularProgress, Typography } from '@mui/material';
import type { ExtractedField } from '../types';

interface FieldsPanelProps {
  extractedFields: ExtractedField[];
  activeFieldId: string | null;
  isExtracting: boolean;
  appError: string;
  onFieldClick: (fieldId: string) => void;
}

export default function FieldsPanel({
  extractedFields,
  activeFieldId,
  isExtracting,
  appError,
  onFieldClick,
}: FieldsPanelProps) {
  return (
    <div className="panel fields-panel">
      <div className="panel-header">
        <Typography component="h2" variant="h6">Extracted Fields</Typography>
        {isExtracting ? <CircularProgress size={18} /> : null}
      </div>

      {appError ? <p className="error-state">{appError}</p> : null}

      {!appError && !isExtracting && extractedFields.length === 0 ? (
        <p className="empty-state">No fields found yet for this invoice.</p>
      ) : null}

      <ul className="field-list">
        {extractedFields.map((field) => {
          const selected = field.id === activeFieldId;

          return (
            <li key={field.id}>
              <button
                type="button"
                className={`field-item ${selected ? 'active' : ''}`}
                onClick={() => onFieldClick(field.id)}
              >
                <span className="field-label">{field.label}</span>
                <Box className="field-value">{field.value}</Box>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
