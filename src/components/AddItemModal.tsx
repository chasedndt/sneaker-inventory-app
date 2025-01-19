// src/components/AddItemModal.tsx
import React, { useState, useCallback } from 'react';
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
import { Dayjs } from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import ProductDetailsForm from './AddItem/ProductDetailsForm';
import SizesQuantityForm, { CategoryType } from './AddItem/SizesQuantityForm';
import PurchaseDetailsForm from './AddItem/PurchaseDetailsForm';
import ImagesUploadForm from './AddItem/ImagesUploadForm';

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
}

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose }) => {
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  
  // Form states
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

  // Error handling state
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});

  // Product Details handlers
  const handleProductDetailsChange = useCallback((field: keyof ProductDetailsFormData, value: string) => {
    if (field === 'category') {
      setProductDetails(prev => ({
        ...prev,
        [field]: value as CategoryType
      }));
      // Reset sizes when category changes
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

  // Validation functions
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
      // For quantity-only categories
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

  // Navigation handlers
  const handleNext = () => {
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
        // Handle final submission
        console.log('Final submission:', {
          productDetails,
          sizesQuantity,
          purchaseDetails,
          images
        });
      }
    }

    if (isValid) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = useCallback(() => {
    // Clean up image previews
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
    onClose();
  }, [images, onClose]);

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
          {activeStep === steps.length - 1 ? 'Add Item' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddItemModal;
