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
import { api, ImageFile } from '../services/api';
import { loadFormData, saveFormData, clearFormData } from '../utils/formPersistence';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);
  const [authCheckingInProgress, setAuthCheckingInProgress] = useState(false);
  
  // Auth integration
  const { currentUser, getAuthToken } = useAuth();
  const navigate = useNavigate();

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
      // Check authentication when modal opens
      checkAuthentication();
      
      const data = loadFormData();
      if (data) {
        console.log('Recovered form data:', data);
        setSavedData(data);
        setShowRecoveryDialog(true);
      }
    }
  }, [open]);

  // Authentication check function
  const checkAuthentication = async () => {
    setAuthCheckingInProgress(true);
    try {
      if (!currentUser) {
        setSubmitError('Authentication required. Please log in to add items.');
        setTimeout(() => {
          onClose();
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Please log in to add items to your inventory.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      const token = await getAuthToken();
      if (!token) {
        setSubmitError('Authentication token is invalid or expired. Please log in again.');
        setTimeout(() => {
          onClose();
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Your session has expired. Please log in again.' 
            } 
          });
        }, 2000);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      setSubmitError('Authentication error. Please log in again.');
      return false;
    } finally {
      setAuthCheckingInProgress(false);
    }
  };

  useEffect(() => {
    if (open) {
      try {
        saveFormData({
          activeStep,
          productDetails,
          sizesQuantity,
          purchaseDetails: {
            ...purchaseDetails,
            purchaseDate: purchaseDetails.purchaseDate?.isValid()
              ? purchaseDetails.purchaseDate.toISOString()
              : null
          }
        });
      } catch (error) {
        console.error('Error saving form data:', error);
      }
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
    const newErrors: { [key: string]: string } = {};
    
    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    try {
      let isValid = true;
      setSubmitError(null);
      
      // Verify authentication on submit
      if (activeStep === 3) {
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) return;
      }

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
              productDetails,
              sizesQuantity,
              purchaseDetails: {
                ...purchaseDetails,
                purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null
              }
            };
            
            setUploadProgress(50);
            
            try {
              // Submit form data and images in a single request
              const response = await api.addItem(formData, images);
              console.log('Form submission response:', response);
              setUploadProgress(100);
              clearFormData();
              handleClose();
            } catch (error: any) {
              // Handle authentication errors specifically
              if (error.message && (
                  error.message.includes('Authentication required') ||
                  error.message.includes('Authentication expired') ||
                  error.message.includes('Authentication token is invalid')
              )) {
                setSubmitError(`Authentication error: ${error.message}`);
                setTimeout(() => {
                  onClose();
                  navigate('/login', { 
                    state: { 
                      from: '/inventory',
                      message: 'Your session has expired. Please log in again.' 
                    } 
                  });
                }, 2000);
              } else {
                setSubmitError(`API Error: ${error.message || 'Failed to process request'}`);
              }
              return;
            }
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

        {/* Authentication check in progress */}
        {authCheckingInProgress && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 2,
            bgcolor: 'background.paper'
          }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Verifying authentication...</Typography>
          </Box>
        )}

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
               uploadProgress < 100 ? 'Saving item and uploading images...' : 'Complete!'}
            </Typography>
          </Box>
        )}

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting || authCheckingInProgress}
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
            disabled={isSubmitting || authCheckingInProgress}
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