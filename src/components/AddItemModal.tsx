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
import CloseIcon from '@mui/icons-material/Close';
import ProductDetailsForm from './AddItem/ProductDetailsForm';
import SizesQuantityForm from './AddItem/SizesQuantityForm';
import PurchaseDetailsForm from './AddItem/PurchaseDetailsForm';
import ImagesUploadForm from './AddItem/ImagesUploadForm';
import RecoveryDialog from './AddItem/RecoveryDialog';
import { api } from '../services/api';
import { loadFormData, saveFormData, clearFormData } from '../utils/formPersistence';
import {
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile,
  AddItemPayload,
  CategoryType
} from '../types/types';
import dayjs from 'dayjs';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
}

interface ApiPurchaseDetails extends Omit<PurchaseDetailsData, 'purchaseDate'> {
  purchaseDate: string | null;
}

interface StoragePurchaseDetails extends Omit<PurchaseDetailsData, 'purchaseDate'> {
  purchaseDate: string | null;
}

const steps = ['Product Details', 'Sizes & Quantity', 'Purchase Details', 'Images'];

const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);
  const [itemId, setItemId] = useState<string | null>(null);

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
    purchasePrice: 0,
    purchaseCurrency: '£',
    shippingPrice: 0,
    shippingCurrency: '£',
    marketPrice: 0,
    purchaseDate: null,
    purchaseLocation: '',
    condition: '',
    notes: '',
    orderID: '',
    tags: [],
    taxType: 'none',
    vatPercentage: 0,
    salesTaxPercentage: 0
  });

  const [images, setImages] = useState<ImageFile[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
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
        const storageData = {
          activeStep,
          productDetails,
          sizesQuantity,
          purchaseDetails: {
            ...purchaseDetails,
            purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null
          } as StoragePurchaseDetails
        };
        saveFormData(storageData);
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
          ? dayjs(savedData.purchaseDetails.purchaseDate) // Convert string to Dayjs
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

  const handleProductDetailsChange = useCallback(
    (field: keyof ProductDetailsFormData, value: string) => {
      setSubmitError(null);
      if (field === 'category') {
        setProductDetails((prev) => ({
          ...prev,
          [field]: value as CategoryType
        }));
        setSizesQuantity({
          sizeSystem: '',
          selectedSizes: []
        });
      } else {
        setProductDetails((prev) => ({
          ...prev,
          [field]: value
        }));
      }
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: ''
        }));
      }
    },
    [errors]
  );

  const handleSizesQuantityChange = useCallback((newData: SizesQuantityData) => {
    setSubmitError(null);
    setSizesQuantity(newData);
  }, []);

  const handlePurchaseDetailsChange = useCallback(
    (field: keyof PurchaseDetailsData, value: any) => {
      setSubmitError(null);
      setPurchaseDetails((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: ''
        }));
      }
    },
    [errors]
  );

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
    setErrors((prev) => ({ ...prev, ...newErrors }));
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
    setErrors((prev) => ({ ...prev, ...newErrors }));
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
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateImages = (): boolean => {
    return true; // Always return true
  };

  const uploadImages = async (itemId: string, images: ImageFile[]): Promise<string[]> => {
    try {
      setIsUploading(true);
      setUploadProgress(25);

      const formData = new FormData();
      images.forEach((file) => {
        formData.append('images', file);
      });

      formData.append('item_id', itemId);

      setUploadProgress(50);

      const uploadedImages = await api.uploadImages(itemId, images);
      setUploadProgress(75);

      await new Promise((resolve) => setTimeout(resolve, 500));

      return uploadedImages;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
        isValid = validateImages();
        if (isValid) {
          setIsSubmitting(true);

          const sanitizedPurchaseDetails: ApiPurchaseDetails = {
            ...purchaseDetails,
            purchaseDate: purchaseDetails.purchaseDate?.toISOString() || null,
            purchasePrice: purchaseDetails.purchasePrice || 0,
            shippingPrice: purchaseDetails.shippingPrice || 0,
            marketPrice: purchaseDetails.marketPrice || 0,
            vatPercentage: purchaseDetails.vatPercentage || 0,
            salesTaxPercentage: purchaseDetails.salesTaxPercentage || 0
          };

          const formData = {
            productDetails,
            sizesQuantity,
            purchaseDetails: sanitizedPurchaseDetails,
            images: []
          };

          try {
            const response = await api.addItem(formData);
            console.log('Form submission response:', response);

            if (response.id) {
              setItemId(response.id);
              if (images.length > 0) {
                try {
                  const uploadedImages = await uploadImages(response.id, images);
                  console.log('Uploaded images:', uploadedImages);
                } catch (uploadError: any) {
                  console.error('Image upload failed:', uploadError);
                  setSubmitError(`Image upload failed: ${uploadError.message || 'Failed to upload images'}`);
                }
              }
            } else {
              throw new Error('Failed to retrieve item ID from the response.');
            }
          } catch (addItemError: any) {
            console.error('Error adding item:', addItemError);
            setSubmitError(addItemError.message || 'Failed to add item.');
            return;
          }

          clearFormData();
          handleClose();
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
    images.forEach((image) => {
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
      purchasePrice: 0,
      purchaseCurrency: '£',
      shippingPrice: 0,
      shippingCurrency: '£',
      marketPrice: 0,
      purchaseDate: null,
      purchaseLocation: '',
      condition: '',
      notes: '',
      orderID: '',
      tags: [],
      taxType: 'none',
      vatPercentage: 0,
      salesTaxPercentage: 0
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
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="div" variant="h6">
            Add New Item
          </Typography>
          <IconButton aria-label="close" onClick={handleClose} sx={{ color: 'grey.500' }}>
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
              <ProductDetailsForm formData={productDetails} onChange={handleProductDetailsChange} errors={errors} />
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
              <PurchaseDetailsForm formData={purchaseDetails} onChange={handlePurchaseDetailsChange} errors={errors} />
            )}
            {activeStep === 3 && (
              <ImagesUploadForm images={images} onChange={setImages} errors={errors} />
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
              {uploadProgress < 50 ? 'Uploading images...' : uploadProgress < 100 ? 'Saving item...' : 'Complete!'}
            </Typography>
          </Box>
        )}

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleBack} disabled={activeStep === 0 || isSubmitting} variant="outlined">
            Back
          </Button>
          <Button onClick={handleNext} variant="contained" color="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : activeStep === steps.length - 1 ? 'Add Item' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>

      <RecoveryDialog open={showRecoveryDialog} onRecover={handleRecover} onDiscard={handleDiscardSavedData} />
    </>
  );
};

export default AddItemModal;
// Part 3 End
