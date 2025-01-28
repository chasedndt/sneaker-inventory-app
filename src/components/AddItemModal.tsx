// ================ PART 1 START ================
// AddItemModal.tsx - Part 1: Imports and Interfaces
import React, { useState, useCallback, useEffect } from 'react';
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
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import ProductDetailsForm from './AddItem/ProductDetailsForm';
import SizesQuantityForm, { CategoryType } from './AddItem/SizesQuantityForm';
import PurchaseDetailsForm from './AddItem/PurchaseDetailsForm';
import ImagesUploadForm from './AddItem/ImagesUploadForm';
import RecoveryDialog from './AddItem/RecoveryDialog';
import { api } from '../services/api';
import { loadFormData, saveFormData, clearFormData } from '../utils/formPersistence';

// Debug logging for API base URL
console.log('AddItemModal mounted, API Configuration loaded');

const steps = [
  'Product Details',
  'Sizes & Quantity',
  'Purchase Details',
  'Images'
];

interface ProductDetailsFormData {
  category: CategoryType;
  productName: string;
  reference: string;
  colorway: string;
  brand: string;
}

interface SizeEntry {
  system: string;
  size: string;
  quantity: string;
}

interface SizesQuantityData {
  sizeSystem: string;
  selectedSizes: SizeEntry[];
}

interface PurchaseDetailsData {
  purchasePrice: string;
  purchaseCurrency: string;
  shippingPrice: string;
  shippingCurrency: string;
  marketPrice: string;
  purchaseDate: Dayjs | null;
  purchaseLocation: string;
  condition: string;
  notes: string;
  orderID: string;
  tags: string[];
  taxType: 'none' | 'vat' | 'salesTax';
  vatPercentage: string;
  salesTaxPercentage: string;
}

interface ImageFile extends File {
  preview?: string;
  id?: string;
}

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose }) => {
  console.log('AddItemModal rendered with props:', { open });

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);
  
  const [productDetails, setProductDetails] = useState<ProductDetailsFormData>({
    category: 'Sneakers',
    productName: '',
    reference: '',
    colorway: '',
    brand: ''
  });

  const [sizesQuantity, setSizesQuantity] = useState<SizesQuantityData>({
    sizeSystem: '',
    selectedSizes: []
  });

  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetailsData>({
    purchasePrice: '',
    purchaseCurrency: '£',
    shippingPrice: '',
    shippingCurrency: '£',
    marketPrice: '',
    purchaseDate: null,
    purchaseLocation: '',
    condition: '',
    notes: '',
    orderID: '',
    tags: [],
    taxType: 'none',
    vatPercentage: '',
    salesTaxPercentage: ''
  });

  const [images, setImages] = useState<ImageFile[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
// ================ PART 1 END ================
// ================ PART 2 START ================
// AddItemModal.tsx - Part 2: Effects and Validation Functions
useEffect(() => {
  console.log('Recovery effect triggered, open:', open);
  if (open) {
    const data = loadFormData();
    if (data) {
      console.log('Recovered form data:', data);
      setSavedData(data);
      setShowRecoveryDialog(true);
    }
  }
}, [open]);

useEffect(() => {
  if (open) {
    try {
      console.log('Saving form data, current step:', activeStep);
      saveFormData({
        activeStep,
        productDetails,
        sizesQuantity,
        purchaseDetails: {
          ...purchaseDetails,
          purchaseDate: purchaseDetails.purchaseDate?.isValid() ? 
            purchaseDetails.purchaseDate.toISOString() : 
            null
        }
      });
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }
}, [open, activeStep, productDetails, sizesQuantity, purchaseDetails]);

const handleRecover = () => {
  console.log('Recovering saved data');
  if (savedData) {
    setActiveStep(savedData.activeStep);
    setProductDetails(savedData.productDetails);
    setSizesQuantity(savedData.sizesQuantity);
    setPurchaseDetails({
      ...savedData.purchaseDetails,
      purchaseDate: savedData.purchaseDetails.purchaseDate 
        ? dayjs(savedData.purchaseDetails.purchaseDate)
        : null
    });
  }
  setShowRecoveryDialog(false);
};

const handleDiscardSavedData = () => {
  console.log('Discarding saved data');
  clearFormData();
  setSavedData(null);
  setShowRecoveryDialog(false);
};

const handleProductDetailsChange = useCallback((field: keyof ProductDetailsFormData, value: string) => {
  console.log('Product details change:', field, value);
  setSubmitError(null);
  if (field === 'category') {
    setProductDetails(prev => ({
      ...prev,
      [field]: value as CategoryType
    }));
    setSizesQuantity({
      sizeSystem: '',
      selectedSizes: []
    });
  } else {
    setProductDetails(prev => ({
      ...prev,
      [field]: value
    }));
  }

  if (errors[field]) {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  }
}, [errors]);

const handleSizesQuantityChange = useCallback((newData: SizesQuantityData) => {
  console.log('Sizes quantity change:', newData);
  setSubmitError(null);
  setSizesQuantity(newData);
}, []);

const handlePurchaseDetailsChange = useCallback((field: keyof PurchaseDetailsData, value: any) => {
  console.log('Purchase details change:', field, value);
  setSubmitError(null);
  setPurchaseDetails(prev => ({ ...prev, [field]: value }));
  
  if (errors[field]) {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  }
}, [errors]);

const validateProductDetails = (): boolean => {
  console.log('Validating product details');
  const newErrors: { [key: string]: string } = {};
  
  if (!productDetails.category) {
    newErrors.category = 'Category is required';
  }
  if (!productDetails.productName) {
    newErrors.productName = 'Product name is required';
  }
  if (!productDetails.brand) {
    newErrors.brand = 'Brand is required';
  }

  setErrors(newErrors);
  const isValid = Object.keys(newErrors).length === 0;
  console.log('Product details validation result:', isValid);
  return isValid;
};

const validateSizesQuantity = (): boolean => {
  console.log('Validating sizes and quantity');
  const newErrors: { [key: string]: string } = {};
  const usesSizeSystem = ['Sneakers', 'Streetwear'].includes(productDetails.category);
  
  if (usesSizeSystem) {
    if (!sizesQuantity.sizeSystem) {
      newErrors.sizeSystem = 'Size system is required';
    }
    if (sizesQuantity.selectedSizes.length === 0) {
      newErrors.sizes = 'At least one size must be selected';
    }
  } else {
    if (sizesQuantity.selectedSizes.length === 0) {
      setSizesQuantity({
        sizeSystem: '',
        selectedSizes: [{
          system: '',
          size: '',
          quantity: '1'
        }]
      });
    }
    return true;
  }

  setErrors(prev => ({ ...prev, ...newErrors }));
  const isValid = Object.keys(newErrors).length === 0;
  console.log('Sizes validation result:', isValid);
  return isValid;
};

const validatePurchaseDetails = (): boolean => {
  console.log('Validating purchase details');
  const newErrors: { [key: string]: string } = {};
  
  if (!purchaseDetails.purchasePrice) {
    newErrors.purchasePrice = 'Purchase price is required';
  }
  if (!purchaseDetails.purchaseLocation) {
    newErrors.purchaseLocation = 'Purchase location is required';
  }
  if (!purchaseDetails.purchaseDate) {
    newErrors.purchaseDate = 'Purchase date is required';
  }
  if (purchaseDetails.taxType === 'vat' && !purchaseDetails.vatPercentage) {
    newErrors.vatPercentage = 'VAT percentage is required when VAT is enabled';
  }
  if (purchaseDetails.taxType === 'salesTax' && !purchaseDetails.salesTaxPercentage) {
    newErrors.salesTaxPercentage = 'Sales tax percentage is required when Sales Tax is enabled';
  }

  setErrors(prev => ({ ...prev, ...newErrors }));
  const isValid = Object.keys(newErrors).length === 0;
  console.log('Purchase details validation result:', isValid);
  return isValid;
};
// ================ PART 2 END ================
// ================ PART 3 START ================
// AddItemModal.tsx - Part 3: Form Submission, Handlers and JSX
const validateImages = (): boolean => {
  console.log('Validating images:', images);
  const newErrors: { [key: string]: string } = {};
  
  if (images.length === 0) {
    newErrors.images = 'At least one image is required';
  }

  setErrors(prev => ({ ...prev, ...newErrors }));
  const isValid = Object.keys(newErrors).length === 0;
  console.log('Images validation result:', isValid);
  return isValid;
};

const handleNext = async () => {
  try {
    let isValid = true;
    setSubmitError(null);
    console.log(`handleNext called - current step: ${activeStep}`);

    if (activeStep === 0) {
      isValid = validateProductDetails();
      console.log('Product details validation:', isValid);
    } else if (activeStep === 1) {
      isValid = validateSizesQuantity();
      console.log('Sizes validation:', isValid);
    } else if (activeStep === 2) {
      isValid = validatePurchaseDetails();
      console.log('Purchase details validation:', isValid);
    } else if (activeStep === 3) {
      console.log('Starting final step submission');
      try {
        console.log('Testing API connection...');
        await api.testConnection();
        
        isValid = validateImages();
        console.log('Images validation:', isValid, 'Images:', images);
        
        if (isValid) {
          setIsSubmitting(true);
          setIsUploading(true);
          
          console.log('Starting image upload...');
          setUploadProgress(25);
          const uploadedImages = await api.uploadImages(images);
          console.log('Images uploaded successfully:', uploadedImages);
          
          setUploadProgress(50);
          const formData = {
            productDetails,
            sizesQuantity,
            purchaseDetails,
            images: uploadedImages
          };
          console.log('Preparing to submit form data:', formData);
          
          const response = await api.addItem(formData);
          console.log('Form submission response:', response);
          
          setUploadProgress(100);
          clearFormData();
          handleClose();
        }
      } catch (error: any) {
        console.error('API call failed:', error);
        setSubmitError(`API Error: ${error.message || 'Failed to process request'}`);
        return;
      }
    }

    if (isValid && activeStep < steps.length - 1) {
      console.log(`Moving to next step: ${activeStep + 1}`);
      setActiveStep((prevStep) => prevStep + 1);
    }
  } catch (error: any) {
    console.error('Form submission error:', error);
    setSubmitError(error.message || 'An unexpected error occurred');
  } finally {
    setIsSubmitting(false);
    setIsUploading(false);
    setUploadProgress(0);
  }
};

const handleBack = () => {
  console.log('Moving back one step');
  setActiveStep((prevStep) => prevStep - 1);
  setSubmitError(null);
};

const handleClose = useCallback(() => {
  console.log('Closing modal and cleaning up');
  images.forEach(image => {
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
  });

  setActiveStep(0);
  setProductDetails({
    category: 'Sneakers',
    productName: '',
    reference: '',
    colorway: '',
    brand: ''
  });
  setSizesQuantity({
    sizeSystem: '',
    selectedSizes: []
  });
  setPurchaseDetails({
    purchasePrice: '',
    purchaseCurrency: '£',
    shippingPrice: '',
    shippingCurrency: '£',
    marketPrice: '',
    purchaseDate: null,
    purchaseLocation: '',
    condition: '',
    notes: '',
    orderID: '',
    tags: [],
    taxType: 'none',
    vatPercentage: '',
    salesTaxPercentage: ''
  });
  setImages([]);
  setErrors({});
  setSubmitError(null);
  setIsUploading(false);
  setUploadProgress(0);
  clearFormData();
  onClose();
}, [images, onClose]);

return (
  <>
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
        <Typography component="div" variant="h6">Add New Item</Typography>
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
        <Box sx={{ minHeight: '400px' }}>
          {activeStep === 0 && (
            <ProductDetailsForm
              formData={productDetails}
              onChange={handleProductDetailsChange}
              errors={errors}
            />
          )}
          {activeStep === 1 && (
            <SizesQuantityForm
              category={productDetails.category}
              formData={sizesQuantity}
              onChange={handleSizesQuantityChange}
              errors={errors}
            />
          )}
          {activeStep === 2 && (
            <PurchaseDetailsForm
              formData={purchaseDetails}
              onChange={handlePurchaseDetailsChange}
              errors={errors}
            />
          )}
          {activeStep === 3 && (
            <ImagesUploadForm
              images={images}
              onChange={setImages}
              errors={errors}
            />
          )}
        </Box>
      </DialogContent>

      {submitError && (
        <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {isUploading && (
        <Box sx={{ mx: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress variant="determinate" value={uploadProgress} size={24} />
          <Typography variant="body2" color="text.secondary">
            {uploadProgress < 50 ? 'Uploading images...' : 
             uploadProgress < 100 ? 'Saving item...' : 'Complete!'}
          </Typography>
        </Box>
      )}

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || isSubmitting}
          variant="outlined"
        >
          Back
        </Button>
        <Button
          onClick={async () => {
            if (activeStep === steps.length - 1) {
              await handleNext();
            } else {
              handleNext();
            }
          }}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : activeStep === steps.length - 1 ? 'Add Item' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>

    <RecoveryDialog
      open={showRecoveryDialog}
      onRecover={handleRecover}
      onDiscard={handleDiscardSavedData}
    />
  </>
);
};

export default AddItemModal;
// ================ PART 3 END ================

