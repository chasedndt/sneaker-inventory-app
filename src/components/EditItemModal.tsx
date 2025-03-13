// src/components/EditItemModal.tsx
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
import { api, ImageFile, Item } from '../services/api';

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

interface EditItemModalProps {
  open: boolean;
  onClose: () => void;
  item?: Item;
  isMultiple?: boolean;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ 
  open, 
  onClose, 
  item, 
  isMultiple = false 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
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

  // Load item data when the modal opens
  useEffect(() => {
    if (open && item) {
      // Populate product details
      setProductDetails({
        category: item.category as CategoryType || 'Sneakers',
        productName: item.productName || '',
        reference: item.reference || '',
        colorway: item.colorway || '',
        brand: item.brand || ''
      });

      // Populate sizes quantity
      if (item.size) {
        // Parse size information - this would need to be adjusted based on your data structure
        const sizeSystem = item.sizeSystem || '';
        const selectedSizes = [{
          system: sizeSystem,
          size: item.size,
          quantity: '1'
        }];
        
        setSizesQuantity({
          sizeSystem,
          selectedSizes
        });
      }

      // Populate purchase details
      setPurchaseDetails({
        purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '',
        purchaseCurrency: '£', // Default or from item
        shippingPrice: item.shippingPrice ? item.shippingPrice.toString() : '',
        shippingCurrency: '£', // Default or from item
        marketPrice: item.marketPrice ? item.marketPrice.toString() : '',
        purchaseDate: item.purchaseDate ? dayjs(item.purchaseDate) : null,
        purchaseLocation: item.purchaseLocation || '',
        condition: item.condition || '',
        notes: item.notes || '',
        orderID: item.orderID || '',
        tags: item.tags || [],
        taxType: 'none', // Default or from item
        vatPercentage: '',
        salesTaxPercentage: ''
      });

      // Load images
      if (item.images && item.images.length > 0) {
        // You'd need to convert URLs to File objects or handle this differently
        // This is a placeholder - real implementation would depend on your image handling
        setImages([]); // Start with empty array, then load actual images
      }
    }
  }, [open, item]);

  const handleProductDetailsChange = useCallback((field: keyof ProductDetailsFormData, value: string) => {
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
    setSubmitError(null);
    setSizesQuantity(newData);
  }, []);

  const handlePurchaseDetailsChange = useCallback((field: keyof PurchaseDetailsData, value: any) => {
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
    // For editing, we might not require new images if there are existing ones
    return true;
  };

  const handleNext = async () => {
    try {
      let isValid = true;
      setSubmitError(null);

      if (activeStep === 0) {
        isValid = validateProductDetails();
      } else if (activeStep === 1) {
        isValid = validateSizesQuantity();
      } else if (activeStep === 2) {
        isValid = validatePurchaseDetails();
      } else if (activeStep === 3) {
        try {
          await api.testConnection();
          isValid = validateImages();
          if (isValid) {
            setIsSubmitting(true);
            setIsUploading(true);
            setUploadProgress(25);
            
            // Prepare form data for submission
            const formData = {
              id: item?.id, // Include item ID for update
              productDetails,
              sizesQuantity,
              purchaseDetails: {
                ...purchaseDetails,
                purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null
              }
            };
            
            setUploadProgress(50);
            
            // Use update endpoint instead of add
            const response = await api.updateItem(formData, images);
            
            console.log('Form update response:', response);
            setUploadProgress(100);
            handleClose();
          }
        } catch (error: any) {
          console.error('API call failed:', error);
          setSubmitError(`API Error: ${error.message || 'Failed to process request'}`);
          return;
        }
      }

      if (isValid && activeStep < steps.length - 1) {
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
    setActiveStep((prevStep) => prevStep - 1);
    setSubmitError(null);
  };

  const handleClose = useCallback(() => {
    images.forEach(image => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });
    setActiveStep(0);
    setSubmitError(null);
    setIsUploading(false);
    setUploadProgress(0);
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
        <Typography component="div" variant="h6">
          {isMultiple ? 'Bulk Edit Items' : 'Edit Item'}
        </Typography>
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
            {uploadProgress < 50 ? 'Preparing data...' : 
             uploadProgress < 100 ? 'Updating item...' : 'Complete!'}
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
          {isSubmitting ? 'Submitting...' : activeStep === steps.length - 1 ? 'Update Item' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditItemModal;