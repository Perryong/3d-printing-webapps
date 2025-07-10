
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, PrintOrder, ModelFile } from '../types/services';

export interface FirebaseFileMetadata {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface UploadedFileWithFirebase extends File {
  firebaseMetadata?: FirebaseFileMetadata;
  isUploading?: boolean;
  uploadError?: string;
}

interface AppState {
  cart: CartItem[];
  orders: PrintOrder[];
  models: ModelFile[];
  selectedProvider: string | null;
  uploadedFiles: UploadedFileWithFirebase[];
}

type AppAction = 
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_ORDER'; payload: PrintOrder }
  | { type: 'SELECT_PROVIDER'; payload: string }
  | { type: 'TOGGLE_MODEL_FAVORITE'; payload: string }
  | { type: 'ADD_UPLOADED_FILE'; payload: File }
  | { type: 'REMOVE_UPLOADED_FILE'; payload: string }
  | { type: 'CLEAR_UPLOADED_FILES' }
  | { type: 'FIREBASE_UPLOAD_START'; payload: string }
  | { type: 'FIREBASE_UPLOAD_SUCCESS'; payload: { fileName: string; metadata: FirebaseFileMetadata } }
  | { type: 'FIREBASE_UPLOAD_ERROR'; payload: { fileName: string; error: string } };

const initialState: AppState = {
  cart: [],
  orders: [],
  models: [],
  selectedProvider: null,
  uploadedFiles: []
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_TO_CART':
      return { ...state, cart: [...state.cart, action.payload] };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.id !== action.payload) };
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity, totalPrice: item.unitPrice * action.payload.quantity }
            : item
        )
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'ADD_ORDER':
      return { ...state, orders: [...state.orders, action.payload] };
    case 'SELECT_PROVIDER':
      return { ...state, selectedProvider: action.payload };
    case 'TOGGLE_MODEL_FAVORITE':
      return {
        ...state,
        models: state.models.map(model =>
          model.id === action.payload ? { ...model, isFavorite: !model.isFavorite } : model
        )
      };
    case 'ADD_UPLOADED_FILE':
      // Remove existing file with same name to avoid duplicates
      const filteredFiles = state.uploadedFiles.filter(file => file.name !== action.payload.name);
      const fileWithMetadata = Object.assign(action.payload, { isUploading: false });
      return { ...state, uploadedFiles: [...filteredFiles, fileWithMetadata] };
    case 'REMOVE_UPLOADED_FILE':
      return { 
        ...state, 
        uploadedFiles: state.uploadedFiles.filter(file => file.name !== action.payload) 
      };
    case 'CLEAR_UPLOADED_FILES':
      return { ...state, uploadedFiles: [] };
    case 'FIREBASE_UPLOAD_START':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map(file =>
          file.name === action.payload
            ? Object.assign(file, { isUploading: true, uploadError: undefined })
            : file
        )
      };
    case 'FIREBASE_UPLOAD_SUCCESS':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map(file =>
          file.name === action.payload.fileName
            ? Object.assign(file, { 
                isUploading: false, 
                firebaseMetadata: action.payload.metadata,
                uploadError: undefined 
              })
            : file
        )
      };
    case 'FIREBASE_UPLOAD_ERROR':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.map(file =>
          file.name === action.payload.fileName
            ? Object.assign(file, { 
                isUploading: false, 
                uploadError: action.payload.error 
              })
            : file
        )
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
