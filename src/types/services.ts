
export interface ServiceProvider {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  capabilities: string[];
  materials: string[];
  pricePerGram: number;
  leadTime: string;
  image: string;
  verified: boolean;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  color: string;
  priceMultiplier: number;
  density: number; // g/cm³
  properties: string[];
  description: string;
}

export interface PrintOrder {
  id: string;
  modelName: string;
  providerId: string;
  material: string;
  quality: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'printing' | 'completed' | 'shipped';
  orderDate: string;
  estimatedDelivery: string;
}

export interface ModelFile {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  uploadDate: string;
  fileSize: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedPrintTime: number;
  isFavorite: boolean;
  isPublic: boolean;
}

export interface CartItem {
  id: string;
  modelName: string;
  material: string;
  quality: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
