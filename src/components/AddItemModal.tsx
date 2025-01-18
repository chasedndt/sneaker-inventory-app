
// src/components/AddItemModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  IconButton,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const steps = [
  'Product Details',
  'Sizes & Quantity',
  'Purchase Details',
  'Images'
];

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Typography variant="h6">Create a new product</Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ width: '100%', px: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Step content will go here */}
        <Box sx={{ minHeight: '400px' }}>
          {activeStep === 0 && (
            <Typography>Product Details Form</Typography>
          )}
          {activeStep === 1 && (
            <Typography>Sizes & Quantity Form</Typography>
          )}
          {activeStep === 2 && (
            <Typography>Purchase Details Form</Typography>
          )}
          {activeStep === 3 && (
            <Typography>Images Upload</Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
        >
          Back
        </Button>
        <Button
          onClick={activeStep === steps.length - 1 ? handleClose : handleNext}
          variant="contained"
          color="primary"
        >
          {activeStep === steps.length - 1 ? 'Add Product' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddItemModal;
