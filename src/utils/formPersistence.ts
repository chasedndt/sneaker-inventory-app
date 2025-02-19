// src/utils/formPersistence.ts
import dayjs from 'dayjs'; // Import dayjs for conversion
import {
  ProductDetailsFormData,
  SizesQuantityData,
  PurchaseDetailsData,
  ImageFile,
  SizeEntry,
  AddItemPayload,
  Item,
  CategoryType
} from '../types/types';

interface FormState {
  activeStep: number;
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: PurchaseDetailsData;
}

interface StorageFormState {
  activeStep: number;
  productDetails: ProductDetailsFormData;
  sizesQuantity: SizesQuantityData;
  purchaseDetails: Omit<PurchaseDetailsData, 'purchaseDate'> & {
    purchaseDate: string | null;
  };
}

const FORM_STORAGE_KEY = 'addItemFormData';

export const saveFormData = (formData: StorageFormState) => {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  } catch (error) {
    console.error('Error saving form data:', error);
  }
};

export const loadFormData = (): FormState | null => {
  try {
    const data = localStorage.getItem(FORM_STORAGE_KEY);
    if (!data) return null;
    const parsed: StorageFormState = JSON.parse(data);
    
    return {
      ...parsed,
      purchaseDetails: {
        ...parsed.purchaseDetails,
        purchaseDate: parsed.purchaseDetails.purchaseDate ? dayjs(parsed.purchaseDetails.purchaseDate) : null
      }
    } as FormState;
  } catch (error) {
    console.error('Error loading form data:', error);
    return null;
  }
};

export const clearFormData = () => {
  try {
    localStorage.removeItem(FORM_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing form data:', error);
  }
};
