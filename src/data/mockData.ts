
import { ServiceProvider, Material, PrintOrder, ModelFile } from '../types/services';

export const mockProviders: ServiceProvider[] = [
  {
    id: '1',
    name: 'PrintMaster Pro',
    description: 'Professional 3D printing service with industrial-grade equipment',
    location: 'San Francisco, CA',
    rating: 4.8,
    reviewCount: 156,
    capabilities: ['FDM', 'SLA', 'SLS'],
    materials: ['PLA', 'ABS', 'PETG', 'TPU', 'Resin'],
    pricePerGram: 0.15,
    leadTime: '3-5 days',
    image: '/placeholder.svg',
    verified: true
  },
  {
    id: '2',
    name: 'QuickPrint Solutions',
    description: 'Fast turnaround printing with competitive pricing',
    location: 'Austin, TX',
    rating: 4.5,
    reviewCount: 89,
    capabilities: ['FDM', 'SLA'],
    materials: ['PLA', 'ABS', 'PETG', 'Resin'],
    pricePerGram: 0.12,
    leadTime: '1-3 days',
    image: '/placeholder.svg',
    verified: true
  },
  {
    id: '3',
    name: 'Precision Prints',
    description: 'High-precision printing for detailed prototypes',
    location: 'New York, NY',
    rating: 4.9,
    reviewCount: 203,
    capabilities: ['SLA', 'SLS', 'Metal'],
    materials: ['Resin', 'Nylon', 'Steel', 'Aluminum'],
    pricePerGram: 0.25,
    leadTime: '5-7 days',
    image: '/placeholder.svg',
    verified: true
  }
];

export const mockMaterials: Material[] = [
  {
    id: 'pla',
    name: 'PLA',
    type: 'Thermoplastic',
    color: 'Various',
    priceMultiplier: 1.0,
    density: 1.24,
    properties: ['Biodegradable', 'Easy to print', 'Low odor'],
    description: 'Perfect for beginners and general purpose printing'
  },
  {
    id: 'abs',
    name: 'ABS',
    type: 'Thermoplastic',
    color: 'Various',
    priceMultiplier: 1.2,
    density: 1.05,
    properties: ['Durable', 'Heat resistant', 'Chemical resistant'],
    description: 'Strong material ideal for functional parts'
  },
  {
    id: 'petg',
    name: 'PETG',
    type: 'Thermoplastic',
    color: 'Various',
    priceMultiplier: 1.4,
    density: 1.27,
    properties: ['Crystal clear', 'Chemical resistant', 'Food safe'],
    description: 'Combines strength of ABS with ease of PLA'
  },
  {
    id: 'tpu',
    name: 'TPU',
    type: 'Flexible',
    color: 'Various',
    priceMultiplier: 2.0,
    density: 1.2,
    properties: ['Flexible', 'Elastic', 'Wear resistant'],
    description: 'Rubber-like material for flexible parts'
  }
];

export const mockOrders: PrintOrder[] = [
  {
    id: 'order-1',
    modelName: 'Phone Case Design',
    providerId: '1',
    material: 'TPU',
    quality: 'Standard',
    quantity: 2,
    totalPrice: 24.50,
    status: 'printing',
    orderDate: '2024-06-20',
    estimatedDelivery: '2024-06-25'
  },
  {
    id: 'order-2',
    modelName: 'Miniature Figure',
    providerId: '3',
    material: 'Resin',
    quality: 'Fine',
    quantity: 5,
    totalPrice: 45.00,
    status: 'completed',
    orderDate: '2024-06-15',
    estimatedDelivery: '2024-06-22'
  }
];

export const mockModels: ModelFile[] = [
  {
    id: 'model-1',
    name: 'Smartphone Stand',
    description: 'Adjustable smartphone stand for desk use',
    category: 'Utility',
    tags: ['phone', 'desk', 'adjustable'],
    uploadDate: '2024-06-20',
    fileSize: 2.5,
    difficulty: 'easy',
    estimatedPrintTime: 120,
    isFavorite: true,
    isPublic: true
  },
  {
    id: 'model-2',
    name: 'Dragon Miniature',
    description: 'Detailed fantasy dragon for tabletop gaming',
    category: 'Miniatures',
    tags: ['dragon', 'fantasy', 'gaming'],
    uploadDate: '2024-06-18',
    fileSize: 8.2,
    difficulty: 'hard',
    estimatedPrintTime: 480,
    isFavorite: false,
    isPublic: true
  }
];
