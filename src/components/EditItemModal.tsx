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
import { useAuthReady } from '../hooks/useAuthReady';
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
  const { currentUser, getAuthToken, authReady } = useAuthReady();
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
      if (!authReady) {
        setSubmitError('Authentication process is not yet complete. Please wait and try again.');
        return false;
      }
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
    
    // Store the current item ID in session storage for our persistence system
    if (itemData?.id) {
      try {
        // Use a consistent key name across components
        const sessionStorageKey = `currentEditItemId`;
        sessionStorage.setItem(sessionStorageKey, itemData.id.toString());
        console.log(`%c[EDIT MODAL] Stored item ID ${itemData.id} in session storage as ${sessionStorageKey}`, 
          'background: #9b59b6; color: white');
          
        // Also set a specific image storage key for this item
        const imageStorageKey = `item_${itemData.id}_images`;
        
        // If item has images, store them in sessionStorage for persistence
        if (itemData.images && itemData.images.length > 0) {
          sessionStorage.setItem(imageStorageKey, JSON.stringify(itemData.images));
          console.log(`%c[EDIT MODAL] Saved ${itemData.images.length} images to sessionStorage`, 
            'background: #27ae60; color: white', itemData.images);
        }
        
        // Check for previously stored images for this item
        const storedImages = sessionStorage.getItem(imageStorageKey);
        if (storedImages) {
          try {
            const parsedImages = JSON.parse(storedImages);
            console.log(`%c[EDIT MODAL] Found stored images in sessionStorage for item ${itemData.id}`, 
              'background: #2ecc71; color: white', parsedImages);
              
            // If the stored images are different from the server images, use the stored ones
            if (parsedImages.length !== (itemData.images?.length || 0)) {
              console.log(`%c[EDIT MODAL] Using stored images instead of server images due to length mismatch`, 
                'background: #e74c3c; color: white', {
                  storedCount: parsedImages.length,
                  serverCount: itemData.images?.length || 0
                });
              // Update the item data with our stored images
              itemData.images = parsedImages;
            }
          } catch (e) {
            console.error('Failed to parse stored images:', e);
          }
        }
      } catch (error) {
        console.error('Failed to store item ID in session storage:', error);
      }
    }
    
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
      console.log('%c[EDIT MODAL] Item has images:', 'background: #3498db; color: white', {
        itemId: itemData.id,
        images: itemData.images,
        count: itemData.images.length,
        userId: itemData.user_id,
        timestamp: new Date().toISOString()
      });
      
      // Diagnostic check for image format
      itemData.images.forEach((img, index) => {
        console.log(`%c[EDIT MODAL] Image ${index} details:`, 'color: #9b59b6', {
          image: img,
          type: typeof img,
          hasSlash: img.includes('/'),
          hasUnderscore: img.includes('_'),
          length: img.length
        });
      });
      
      setExistingImages(itemData.images);
      setImages([]);
    } else {
      console.warn('%c[EDIT MODAL] Item has no images', 'color: orange', {
        itemId: itemData.id,
        itemData
      });
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
        isValid = validateImages();
        
        if (isValid) {
          setIsSubmitting(true);
          setIsUploading(true);
          setUploadProgress(25);
          
          try {
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
              existingImages: existingImages
            };
            
            // Debug log for update operation
            console.log('%c[EDIT MODAL] 🔄 Updating item', 'background: #16a085; color: white', {
              itemId: formData.id,
              images: images.map(img => ({ name: img.name, size: img.size, preview: !!img.preview })),
              existingImages: existingImages,
              timestamp: new Date().toISOString()
            });
            
            // Ensure we have a valid ID before updating
            if (!formData.id) {
              throw new Error('Cannot update item: missing item ID');
            }
            
            // Call API to update the item
            const response = await api.updateItem({...formData, id: formData.id as number}, images);
            console.log('%c[EDIT MODAL] ✅ Update API response successful', 'background: #27ae60; color: white', response);
            
            // Apply advanced workaround for image deletion/reordering issues
            if (response?.item && existingImages) {
              console.log(`%c[EDIT MODAL] 🧰 Applying client-side image update workaround`, 'background: #3498db; color: white', {
                serverImages: response.item.images,
                clientImages: existingImages,
                itemId: formData.id,
                timestamp: new Date().toISOString()
              });
              
              // Check if the server processed our changes correctly
              const serverImageCount = response.item.images?.length || 0;
              const clientImageCount = existingImages.length;
              
              if (serverImageCount !== clientImageCount) {
                console.log(`%c[EDIT MODAL] ⚠️ Detected image count mismatch! Server: ${serverImageCount}, Client: ${clientImageCount}`, 
                  'background: #c0392b; color: white');
                  
                // Show a temporary notification
                setSubmitError('Warning: Server did not process image changes correctly. Client-side fix applied.');
                setTimeout(() => setSubmitError(null), 3000);
              }
              
              // Force the server response to use our client-side images EVERY TIME
              // This ensures we always get the correct images, even if the server is inconsistent
              response.item.images = [...existingImages];
              
              // Also update the item in our cache if it exists
              if (typeof window !== 'undefined' && window.cachedItems) {
                const cachedItemIndex = window.cachedItems.findIndex((item: any) => item.id === formData.id);
                if (cachedItemIndex >= 0) {
                  window.cachedItems[cachedItemIndex].images = [...existingImages];
                  console.log(`%c[CACHE] 📦 Updated cached item images`, 'background: #2ecc71; color: white');
                  
                  // Force update all representations of this item
                  const timestamp = new Date().toISOString();
                  localStorage.setItem(`item_${formData.id}_images`, JSON.stringify(existingImages));
                  localStorage.setItem(`item_${formData.id}_last_update`, timestamp);
                  console.log(`%c[EDIT MODAL] 💾 Forced persistent update of item images`, 'background: #8e44ad; color: white');
                }
              }
            }
            
            // Handle warning from the API service
            if (response?.clientWarning) {
              console.log(`%c[EDIT MODAL] ⚠️ Received client warning from API: ${response.clientWarning}`, 
                'background: #f39c12; color: white');
              setSubmitError(response.clientWarning);
              setTimeout(() => setSubmitError(null), 3000);
            }
            
            setUploadProgress(100);
            handleClose(true); // Pass true to indicate successful update
          } catch (submitError: any) {
            console.error('%c[EDIT MODAL] ❌ Error submitting form:', 'background: #c0392b; color: white', {
              error: submitError,
              message: submitError.message,
              stack: submitError.stack,
              itemId: item?.id,
              timestamp: new Date().toISOString()
            });
            
            // Provide more detailed error message
            let errorMessage = submitError.message || 'Unknown error';
            if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
              errorMessage = 'Network connection error. The server may be down or CORS is not configured correctly.';
            } else if (errorMessage.includes('Authentication')) {
              errorMessage = 'Authentication error. Please try logging in again.';
            }
            
            setSubmitError(`Error updating item: ${errorMessage}`);
            setIsSubmitting(false);
            setIsUploading(false);
            return;
          }
        }
      }
      
      // If we're not submitting on the final step, just move to the next step
      if (isValid && activeStep < steps.length - 1) {
        setActiveStep(prevStep => prevStep + 1);
      }
    } catch (error: any) {
      console.error('Error in handleNext:', error);
      setSubmitError(`An unexpected error occurred: ${error.message}`);
      setIsSubmitting(false);
      setIsUploading(false);
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
              onExistingImagesChange={setExistingImages}
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