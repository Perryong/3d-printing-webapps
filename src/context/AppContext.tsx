
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CartItem, PrintOrder, ModelFile } from '../types/services';

interface AppState {
  cart: CartItem[];
  orders: PrintOrder[];
  models: ModelFile[];
  selectedProvider: string | null;
}

type AppAction = 
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_ORDER'; payload: PrintOrder }
  | { type: 'SELECT_PROVIDER'; payload: string }
  | { type: 'TOGGLE_MODEL_FAVORITE'; payload: string };

const initialState: AppState = {
  cart: [],
  orders: [],
  models: [],
  selectedProvider: null
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
