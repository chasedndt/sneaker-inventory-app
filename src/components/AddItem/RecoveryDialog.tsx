// src/components/AddItem/RecoveryDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface RecoveryDialogProps {
  open: boolean;
  onRecover: () => void;
  onDiscard: () => void;
}

const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  open,
  onRecover,
  onDiscard
}) => {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestoreIcon color="primary" />
          <Typography variant="h6">Recover Previous Data?</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          We found previously saved data for this form. Would you like to recover it and continue where you left off?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button
          startIcon={<DeleteOutlineIcon />}
          onClick={onDiscard}
          color="error"
          variant="outlined"
        >
          Discard
        </Button>
        <Button
          startIcon={<RestoreIcon />}
          onClick={onRecover}
          variant="contained"
          color="primary"
        >
          Recover Data
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecoveryDialog;
