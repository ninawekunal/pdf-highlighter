import { type FormEvent } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';

interface UploadInvoiceDialogProps {
  open: boolean;
  uploadError: string;
  isUploading: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function UploadInvoiceDialog({
  open,
  uploadError,
  isUploading,
  onClose,
  onFileChange,
  onSubmit,
}: UploadInvoiceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        Upload Invoice PDF
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 10, top: 10 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={onSubmit}>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>
            Upload one invoice PDF to test the extractor. Restrictions: PDF only, one page max, invoice-like content.
          </Typography>

          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />

          {uploadError ? (
            <Typography color="error" sx={{ mt: 1.5 }}>
              {uploadError}
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isUploading}>
            {isUploading ? 'Validating...' : 'Add Invoice'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
