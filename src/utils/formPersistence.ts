// src/utils/formPersistence.ts
import { Dayjs } from 'dayjs';
import { CategoryType } from '../components/AddItem/SizesQuantityForm';

interface FormState {
  activeStep: number;
  productDetails: {
    category: CategoryType;
    productName: string;
    reference: string;
    colorway: string;
    brand: string;
  };
  sizesQuantity: {
    sizeSystem: string;
    selectedSizes: Array<{
      system: string;
      size: string;
      quantity: string;
    }>;
  };
  purchaseDetails: {
    purchasePrice: string;
    purchaseCurrency: string;
    shippingPrice: string;
    shippingCurrency: string;
    marketPrice: string;
    purchaseDate: string | null; // We'll store date as ISO string
    purchaseLocation: string;
    condition: string;
    notes: string;
    orderID: string;
    tags: string[];
    taxType: 'none' | 'vat' | 'salesTax';
    vatPercentage: string;
    salesTaxPercentage: string;
  };
}

const FORM_STORAGE_KEY = 'addItemFormData';

export const saveFormData = (formData: FormState) => {
  try {
    const serializedData = JSON.stringify(formData);
    localStorage.setItem(FORM_STORAGE_KEY, serializedData);
  } catch (error) {
    console.error('Error saving form data:', error);
  }
};

export const loadFormData = (): FormState | null => {
  try {
    const serializedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (!serializedData) return null;
    return JSON.parse(serializedData);
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
