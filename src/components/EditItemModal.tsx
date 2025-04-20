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
  const [authCheckingInProgress, setAuthCheckingInProgress] = useState(false);

  // Auth integration
  const { currentUser, getAuthToken } = useAuth();
  const navigate = useNavigate();

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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Authentication check function
  const checkAuthentication = async () => {
    setAuthCheckingInProgress(true);
    try {
      if (!currentUser) {
        setSubmitError('Authentication required. Please log in to edit items.');
        setTimeout(() => {
          onClose();
          navigate('/login', { 
            state: { 
              from: '/inventory',
              message: 'Please log in to edit items in your inventory.' 
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

  // Check authentication when modal opens and verify item ownership
  useEffect(() => {
    if (open) {
      const verifyAuthAndOwnership = async () => {
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) return;
        
        // Verify item ownership if an item is provided
        if (item) {
          try {
            // Fetch the item to verify ownership
            const fetchedItem = await api.getItem(item.id);
            if (!fetchedItem) {
              setSubmitError('Item not found or you do not have permission to edit it.');
              setTimeout(() => {
                onClose();
              }, 2000);
              return;
            }
            
            // Continue with loading the item data
            loadItemData(item);
          } catch (error: any) {
            // Handle unauthorized access or other errors
            if (error.message && (
                error.message.includes('Unauthorized access') ||
                error.message.includes('permission')
            )) {
              setSubmitError('You do not have permission to edit this item.');
            } else {
              setSubmitError(`Error loading item: ${error.message}`);
            }
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        }
      };
      
      verifyAuthAndOwnership();
    }
  }, [open, item]);

  // Load item data when the modal opens
  const loadItemData = (itemData: Item) => {
    console.log('Loading item data for editing:', itemData);
    
    // Populate product details
    setProductDetails({
      category: itemData.category as CategoryType || 'Sneakers',
      productName: itemData.productName || '',
      reference: itemData.reference || '',
      colorway: itemData.colorway || '',
      brand: itemData.brand || ''
    });

    // Populate sizes quantity
    if (itemData.size) {
      // Parse size information
      const sizeSystem = itemData.sizeSystem || '';
      const selectedSizes = [{
        system: sizeSystem,
        size: itemData.size,
        quantity: '1'
      }];
      
      setSizesQuantity({
        sizeSystem,
        selectedSizes
      });
    }

    // Populate purchase details
    setPurchaseDetails({
      purchasePrice: itemData.purchasePrice ? itemData.purchasePrice.toString() : '',
      purchaseCurrency: '£', // Default or from item
      shippingPrice: itemData.shippingPrice ? itemData.shippingPrice.toString() : '',
      shippingCurrency: '£', // Default or from item
      marketPrice: itemData.marketPrice ? itemData.marketPrice.toString() : '',
      purchaseDate: itemData.purchaseDate ? dayjs(itemData.purchaseDate) : null,
      purchaseLocation: itemData.purchaseLocation || '',
      condition: itemData.condition || '',
      notes: itemData.notes || '',
      orderID: itemData.orderID || '',
      tags: itemData.tags || [],
      taxType: 'none', // Default or from item
      vatPercentage: '',
      salesTaxPercentage: ''
    });

    // Store existing images separately to better handle them
    if (itemData.images && itemData.images.length > 0) {
      console.log('Item has images:', itemData.images);
      setExistingImages(itemData.images);
      setImages([]);
    } else {
      setExistingImages([]);
    }
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
    // For editing, we don't require new images if there are existing ones
    return true;
  };

  const handleNext = async () => {
    try {
      let isValid = true;
      setSubmitError(null);

      // Verify authentication on final step submission
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
          // Test connection before submitting
          await api.testConnection();
          isValid = validateImages();
          
          if (isValid) {
            setIsSubmitting(true);
            setIsUploading(true);
            setUploadProgress(25);
            
            // Prepare form data for submission - include the itemId for update
            const formData = {
              id: item?.id, // Include item ID for update
              productDetails,
              sizesQuantity,
              purchaseDetails: {
                ...purchaseDetails,
                // Ensure purchaseDate is properly formatted
                purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null,
                // Handle possible empty strings for numeric fields
                shippingPrice: purchaseDetails.shippingPrice || '0',
                marketPrice: purchaseDetails.marketPrice || '0',
                vatPercentage: purchaseDetails.vatPercentage || '0',
                salesTaxPercentage: purchaseDetails.salesTaxPercentage || '0'
              },
              status: item?.status || 'unlisted' // Preserve the current status
            };
            
            console.log('Submitting update data:', formData);
            setUploadProgress(50);
            
            try {
              // Use update endpoint
              let response;
              if (isMultiple && selectedItems?.length > 1) {
                // Bulk update logic would go here
                response = await Promise.all(
                  selectedItems.map(itemId => 
                    api.updateItem({...formData, id: itemId}, images)
                  )
                );
              } else {
                // Single item update
                response = await api.updateItem(formData, images);
              }
              
              console.log('Form update response:', response);
              setUploadProgress(100);
              handleClose(true); // Pass true to indicate successful update
            } catch (error: any) {
              // Handle authentication errors specifically
              if (error.message && (
                  error.message.includes('Authentication required') ||
                  error.message.includes('Authentication expired') ||
                  error.message.includes('Authentication token is invalid') ||
                  error.message.includes('Unauthorized access')
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
              setIsSubmitting(false);
              setIsUploading(false);
              setUploadProgress(0);
              return;
            }
          }
        } catch (error: any) {
          console.error('API call failed:', error);
          setSubmitError(`API Error: ${error.message || 'Failed to process request'}`);
          setIsSubmitting(false);
          setIsUploading(false);
          setUploadProgress(0);
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
      if (activeStep !== steps.length - 1) {
        setIsSubmitting(false);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setSubmitError(null);
  };

  // Access to selectedItems for bulk edit operations
  const [selectedItems] = useState<number[]>([]);

  const handleClose = useCallback((success = false) => {
    // Clean up
    images.forEach(image => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });
    
    setActiveStep(0);
    setSubmitError(null);
    setIsUploading(false);
    setIsSubmitting(false);
    setUploadProgress(0);
    
    // Reset form data
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
    setExistingImages([]);
    setErrors({});
    
    onClose();
  }, [images, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={() => handleClose()}
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
          onClick={() => handleClose()}
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
              existingImages={existingImages}
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
          disabled={activeStep === 0 || isSubmitting || authCheckingInProgress}
          variant="outlined"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          color="primary"
          disabled={isSubmitting || authCheckingInProgress}
        >
          {isSubmitting ? 'Submitting...' : activeStep === steps.length - 1 ? 'Update Item' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditItemModal;