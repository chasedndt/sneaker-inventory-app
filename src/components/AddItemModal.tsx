// src/components/AddItemModal.tsx
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
  Alert
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
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (open) {
      const data = loadFormData();
      if (data) {
        setSavedData(data);
        setShowRecoveryDialog(true);
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      saveFormData({
        activeStep,
        productDetails,
        sizesQuantity,
        purchaseDetails: {
          ...purchaseDetails,
          purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null
        }
      });
    }
  }, [open, activeStep, productDetails, sizesQuantity, purchaseDetails]);

  const handleRecover = () => {
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
    clearFormData();
    setSavedData(null);
    setShowRecoveryDialog(false);
  };

  const handleProductDetailsChange = useCallback((field: keyof ProductDetailsFormData, value: string) => {
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
    setSizesQuantity(newData);
  }, []);

  const handlePurchaseDetailsChange = useCallback((field: keyof PurchaseDetailsData, value: any) => {
    setPurchaseDetails(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const validateProductDetails = (): boolean => {
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
    return Object.keys(newErrors).length === 0;
  };

  const validateSizesQuantity = (): boolean => {
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
    return Object.keys(newErrors).length === 0;
  };

  const validatePurchaseDetails = (): boolean => {
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
    return Object.keys(newErrors).length === 0;
  };

  const validateImages = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    let isValid = true;

    if (activeStep === 0) {
      isValid = validateProductDetails();
    } else if (activeStep === 1) {
      isValid = validateSizesQuantity();
    } else if (activeStep === 2) {
      isValid = validatePurchaseDetails();
    } else if (activeStep === 3) {
      isValid = validateImages();
      if (isValid) {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
          const uploadedImages = await api.uploadImages(images);
          await api.addItem({
            productDetails,
            sizesQuantity,
            purchaseDetails,
            images: uploadedImages
          });
          clearFormData();
          handleClose();
        } catch (error) {
          setSubmitError('Failed to submit item. Please try again.');
          isValid = false;
        } finally {
          setIsSubmitting(false);
        }
      }
    }

    if (isValid && activeStep < steps.length - 1) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = useCallback(() => {
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
          <Typography variant="h6">Add New Item</Typography>
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

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting}
            variant="outlined"
          >
            Back
          </Button>
          <Button
            onClick={activeStep === steps.length - 1 ? handleClose : handleNext}
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
