import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Move3D, Settings, Store, Calculator as CalcIcon } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Components
import FileUpload from './FileUpload';
import SettingsPanel from './SettingsPanel';
import PrintTimeDisplay from './PrintTimeDisplay';
import ViewerControls from './ViewerControls';
import ViewerDisplay from './ViewerDisplay';
import AboutMe from './about/AboutMe';
import ContactMe from './contact/ContactMe';
import ModelTransformControls from './ModelTransformControls';
import ModelList from './ModelList';

// Utils
import { loadSTL } from '../utils/stlLoader';
import { estimatePrintTime, PrintSettings, PrintEstimate } from '../utils/printEstimator';
import { analyzeGCode, GCodeAnalysis } from '../utils/gcodeAnalyzer';
import { createScene, SceneRefs, OrbitControls } from '../utils/sceneManager';
import { ModelManager, ModelData } from '../utils/modelManager';
import { calculateMeshVolume, convertMmToCm } from '@/utils/stlVolumeCalculator';

// Services
import { uploadFileToStorage } from '../services/firebaseStorage';

// Context
import { useApp } from '../context/AppContext';

// Constants
import { DEFAULT_PRINT_SETTINGS } from '../constants/printerSpecs';

interface ModelInfo {
  vertices: number;
  triangles: number;
  size: {
    x: string;
    y: string;
    z: string;
  };
  volume: string;
}

type ViewMode = 'viewer' | 'about' | 'contact';

const STLViewer: React.FC = () => {
  const { dispatch, state } = useApp();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [printTimeEstimate, setPrintTimeEstimate] = useState<PrintEstimate | GCodeAnalysis | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slicingMethod, setSlicingMethod] = useState<'simplified' | 'gcode'>('simplified');
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'select' | 'move' | 'rotate' | 'scale'>('select');

  // Refs
  const sceneRefs = useRef<SceneRefs | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelManagerRef = useRef<ModelManager | null>(null);

  // Debug logging for settings panel visibility
  useEffect(() => {
    console.log('Settings panel visibility debug:', {
      viewMode,
      showSettings,
      shouldShowPanel: viewMode === 'viewer' && showSettings
    });
  }, [viewMode, showSettings]);

  // Initialize scene
  const initializeScene = useCallback((container: HTMLElement) => {
    try {
      const { refs, controls, animate } = createScene(container);
      sceneRefs.current = refs;
      controlsRef.current = controls;
      
      // Initialize model manager
      modelManagerRef.current = new ModelManager(refs.scene, refs.camera, refs.renderer);
      
      animate();
      
      return () => {
        if (modelManagerRef.current) {
          modelManagerRef.current.dispose();
        }
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      };
    } catch (err) {
      console.error('Failed to initialize scene:', err);
      setError('Failed to initialize 3D viewer');
    }
  }, []);

  // Upload file to Firebase
  const uploadToFirebase = async (file: File) => {
    try {
      dispatch({ type: 'FIREBASE_UPLOAD_START', payload: file.name });
      toast.info(`Uploading ${file.name} to cloud storage...`);
      
      const uploadResult = await uploadFileToStorage(file);
      
      dispatch({ 
        type: 'FIREBASE_UPLOAD_SUCCESS', 
        payload: { 
          fileName: file.name, 
          metadata: {
            ...uploadResult,
            uploadedAt: new Date()
          }
        }
      });
      
      toast.success(`${file.name} uploaded to cloud storage successfully!`);
      console.log('File uploaded to Firebase:', uploadResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      dispatch({ 
        type: 'FIREBASE_UPLOAD_ERROR', 
        payload: { fileName: file.name, error: errorMessage }
      });
      toast.error(`Failed to upload ${file.name} to cloud storage: ${errorMessage}`);
      console.error('Firebase upload error:', error);
    }
  };

  // Load STL file
  const loadSTLFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Store the file in app context for contact form
      dispatch({ type: 'ADD_UPLOADED_FILE', payload: file });
      toast.success(`File "${file.name}" loaded into viewer`);

      // Upload to Firebase in the background
      uploadToFirebase(file);

      const arrayBuffer = await file.arrayBuffer();
      const geometry = loadSTL(arrayBuffer);
      
      if (!sceneRefs.current || !modelManagerRef.current) {
        throw new Error('Scene not initialized');
      }

      // Show the grid when file is uploaded
      sceneRefs.current.showGrid();

      // Create unique model ID
      const modelId = `model_${Date.now()}`;
      const modelData = modelManagerRef.current.addModel(modelId, file.name, geometry);
      
      // Update models list
      setModels(prev => [...prev, modelData]);
      setSelectedModelId(modelId);
      modelManagerRef.current.selectModel(modelId);
      
      // Adjust camera for better view
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      sceneRefs.current.camera.position.set(
        maxDim * 1.5, 
        maxDim * 1.5, 
        maxDim * 1.5
      );
      sceneRefs.current.camera.lookAt(0, 0, size.z / 2);
      
      // Calculate actual mesh volume using proper geometry calculation
      const volumeMm3 = calculateMeshVolume(geometry);
      const volumeCm3 = convertMmToCm(volumeMm3);
      
      setFileName(file.name);
      setModelInfo({
        vertices: geometry.attributes.position.count,
        triangles: geometry.attributes.position.count / 3,
        size: {
          x: size.x.toFixed(2),
          y: size.y.toFixed(2),
          z: size.z.toFixed(2)
        },
        volume: volumeCm3.toFixed(2)
      });
      
      if (slicingMethod === 'simplified') {
        const timeEstimate = estimatePrintTime(geometry, printSettings);
        setPrintTimeEstimate(timeEstimate);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load STL file');
    } finally {
      setIsLoading(false);
    }
  }, [printSettings, slicingMethod, dispatch]);

  // Handle G-code file upload
  const handleGCodeUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Store the file in app context for contact form
      dispatch({ type: 'ADD_UPLOADED_FILE', payload: file });
      toast.success(`File "${file.name}" loaded into viewer`);

      // Upload to Firebase in the background
      uploadToFirebase(file);

      const content = await file.text();
      const analysis = analyzeGCode(content);
      setPrintTimeEstimate(analysis);
      setFileName(file.name);
      setSlicingMethod('gcode');
      
      // Show grid for G-code files too
      if (sceneRefs.current) {
        sceneRefs.current.showGrid();
      }
    } catch (err) {
      setError('Failed to analyze G-code file');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.stl')) {
      setSlicingMethod('simplified');
      loadSTLFile(file);
    } else if (fileName.endsWith('.gcode') || fileName.endsWith('.g')) {
      handleGCodeUpload(file);
    } else {
      setError('Please select a valid STL or G-code file');
    }
  }, [loadSTLFile, handleGCodeUpload]);

  // Model manipulation handlers
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    if (modelManagerRef.current) {
      modelManagerRef.current.selectModel(modelId);
    }
  }, []);

  const handleModelToggleVisibility = useCallback((modelId: string) => {
    if (modelManagerRef.current) {
      const model = models.find(m => m.id === modelId);
      if (model) {
        const newVisibility = !model.visible;
        modelManagerRef.current.setModelVisibility(modelId, newVisibility);
        setModels(prev => prev.map(m => 
          m.id === modelId ? { ...m, visible: newVisibility } : m
        ));
      }
    }
  }, [models]);

  const handleModelToggleLock = useCallback((modelId: string) => {
    if (modelManagerRef.current) {
      const model = models.find(m => m.id === modelId);
      if (model) {
        const newLocked = !model.locked;
        modelManagerRef.current.setModelLocked(modelId, newLocked);
        setModels(prev => prev.map(m => 
          m.id === modelId ? { ...m, locked: newLocked } : m
        ));
      }
    }
  }, [models]);

  const handleTransformModeChange = useCallback((mode: 'select' | 'move' | 'rotate' | 'scale') => {
    setTransformMode(mode);
    if (modelManagerRef.current) {
      modelManagerRef.current.setTransformMode(mode);
    }
  }, []);

  const handleModelDuplicate = useCallback(() => {
    if (selectedModelId && modelManagerRef.current) {
      const newModel = modelManagerRef.current.duplicateModel(selectedModelId);
      if (newModel) {
        setModels(prev => [...prev, newModel]);
      }
    }
  }, [selectedModelId]);

  const handleModelDelete = useCallback(() => {
    if (selectedModelId && modelManagerRef.current) {
      modelManagerRef.current.removeModel(selectedModelId);
      setModels(prev => prev.filter(m => m.id !== selectedModelId));
      setSelectedModelId(null);
    }
  }, [selectedModelId]);

  const handleModelReset = useCallback(() => {
    if (selectedModelId && modelManagerRef.current) {
      modelManagerRef.current.resetModelTransform(selectedModelId);
      // Update the models state with the reset transform
      const updatedModel = modelManagerRef.current.getSelectedModel();
      if (updatedModel) {
        setModels(prev => prev.map(m => 
          m.id === selectedModelId ? { ...m, transform: updatedModel.transform } : m
        ));
      }
    }
  }, [selectedModelId]);

  const handleModelTransformChange = useCallback((
    axis: 'x' | 'y' | 'z',
    value: number,
    type: 'position' | 'rotation' | 'scale'
  ) => {
    if (selectedModelId && modelManagerRef.current) {
      // Update the model manager
      modelManagerRef.current.updateModelProperty(selectedModelId, type, axis, value);
      
      // Update the local state
      setModels(prev => prev.map(m => {
        if (m.id === selectedModelId) {
          const updatedTransform = {
            ...m.transform,
            [type]: {
              ...m.transform[type],
              [axis]: value
            }
          };
          return { ...m, transform: updatedTransform };
        }
        return m;
      }));
    }
  }, [selectedModelId]);

  // Camera controls updated for bottom-positioned grid
  const resetCamera = useCallback(() => {
    if (sceneRefs.current?.camera) {
      if (sceneRefs.current?.mesh) {
        const box = new THREE.Box3().setFromObject(sceneRefs.current.mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        sceneRefs.current.camera.position.set(
          maxDim * 1.5, 
          maxDim * 1.5, 
          maxDim * 1.5
        );
        sceneRefs.current.camera.lookAt(0, 0, size.z / 2);
      } else {
        sceneRefs.current.camera.position.set(200, 200, 200);
        sceneRefs.current.camera.lookAt(0, 0, 50); // Look slightly above the build platform
      }
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (sceneRefs.current?.camera) {
      sceneRefs.current.camera.position.multiplyScalar(0.8);
      sceneRefs.current.camera.position.clampLength(50, 800);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (sceneRefs.current?.camera) {
      sceneRefs.current.camera.position.multiplyScalar(1.25);
      sceneRefs.current.camera.position.clampLength(50, 800);
    }
  }, []);

  // Update print time when settings change
  useEffect(() => {
    if (sceneRefs.current?.mesh && slicingMethod === 'simplified') {
      const timeEstimate = estimatePrintTime(sceneRefs.current.mesh.geometry, printSettings);
      setPrintTimeEstimate(timeEstimate);
    }
  }, [printSettings, slicingMethod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sceneRefs.current?.renderer && sceneRefs.current.renderer.domElement.parentNode) {
        sceneRefs.current.renderer.domElement.parentNode.removeChild(sceneRefs.current.renderer.domElement);
      }
      if (sceneRefs.current?.mesh) {
        sceneRefs.current.mesh.geometry.dispose();
        sceneRefs.current.mesh.material.dispose();
      }
      if (sceneRefs.current?.renderer) {
        sceneRefs.current.renderer.dispose();
      }
    };
  }, []);

  // Hide settings when switching away from viewer mode
  useEffect(() => {
    if (viewMode !== 'viewer') {
      setShowSettings(false);
    }
  }, [viewMode]);

  const getModelVolume = () => {
    if (modelInfo) {
      return parseFloat(modelInfo.volume);
    }
    return 10;
  };

  const getModelWeight = () => {
    if (modelInfo) {
      const volume = parseFloat(modelInfo.volume);
      return volume * 1.24; // PLA density
    }
    return 12;
  };

  const getPrintTime = () => {
    if (printTimeEstimate && 'totalTime' in printTimeEstimate) {
      return printTimeEstimate.totalTime;
    }
    return 7200;
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  // Get current file upload status
  const currentFile = state.uploadedFiles.find(f => f.name === fileName);
  const isUploading = currentFile?.isUploading || false;
  const uploadError = currentFile?.uploadError;

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
            <Move3D className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
            <span className="hidden sm:inline">3D Print Services Platform</span>
            <span className="sm:hidden">3D Print Services</span>
          </h1>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <FileUpload 
              onFileSelect={handleFileUpload} 
              isLoading={isLoading}
              isUploading={isUploading}
              uploadError={uploadError}
            />
            
            {/* View Mode Tabs */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('viewer')}
                className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                  viewMode === 'viewer' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Viewer
              </button>
              <button
                onClick={() => setViewMode('about')}
                className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'about' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Store className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">About</span>
              </button>
              <button
                onClick={() => setViewMode('contact')}
                className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'contact' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <CalcIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Contact</span>
              </button>
            </div>
            
            {/* Settings button - only show when in viewer mode */}
            {viewMode === 'viewer' && (
              <button
                onClick={() => {
                  console.log('Settings button clicked, current showSettings:', showSettings);
                  setShowSettings(!showSettings);
                }}
                className={`px-2 lg:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showSettings 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden lg:inline">Settings</span>
              </button>
            )}
            
            {fileName && slicingMethod !== 'gcode' && viewMode === 'viewer' && (
              <ViewerControls
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                onResetCamera={resetCamera}
              />
            )}
          </div>
        </div>
        
        {/* File Info */}
        {fileName && (
          <div className="mt-3 text-sm text-gray-300">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              <span><span className="font-semibold">File:</span> {fileName}</span>
              {modelInfo && (
                <>
                  <span className="hidden sm:inline"><span className="font-semibold">Triangles:</span> {modelInfo.triangles.toLocaleString()}</span>
                  <span><span className="font-semibold">Size:</span> {modelInfo.size.x} × {modelInfo.size.y} × {modelInfo.size.z} mm</span>
                  <span><span className="font-semibold">Volume:</span> {modelInfo.volume} cm³</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Model List and Transform Controls */}
        {viewMode === 'viewer' && (
          <div className="w-full sm:w-72 md:w-80 lg:w-80 xl:w-96 bg-gray-900 border-r border-gray-700 p-2 lg:p-4 space-y-4 overflow-y-auto flex-shrink-0">
            <ModelList
              models={models.map(m => ({
                id: m.id,
                name: m.name,
                visible: m.visible,
                locked: m.locked,
                selected: m.id === selectedModelId
              }))}
              onModelSelect={handleModelSelect}
              onModelToggleVisibility={handleModelToggleVisibility}
              onModelToggleLock={handleModelToggleLock}
            />
            
            <ModelTransformControls
              selectedModel={selectedModelId}
              onMove={() => handleTransformModeChange('move')}
              onRotate={() => handleTransformModeChange('rotate')}
              onScale={() => handleTransformModeChange('scale')}
              onDuplicate={handleModelDuplicate}
              onDelete={handleModelDelete}
              onReset={handleModelReset}
              position={selectedModel ? selectedModel.transform.position : { x: 0, y: 0, z: 0 }}
              rotation={selectedModel ? selectedModel.transform.rotation : { x: -Math.PI / 2, y: 0, z: 0 }}
              scale={selectedModel ? selectedModel.transform.scale : { x: 1, y: 1, z: 1 }}
              onPositionChange={(axis, value) => handleModelTransformChange(axis, value, 'position')}
              onRotationChange={(axis, value) => handleModelTransformChange(axis, value, 'rotation')}
              onScaleChange={(axis, value) => handleModelTransformChange(axis, value, 'scale')}
            />
          </div>
        )}

        {/* Settings panel - visible in viewer mode when showSettings is true */}
        {viewMode === 'viewer' && showSettings && (
          <div className="flex-shrink-0 w-full sm:w-72 md:w-80 lg:w-80 xl:w-96">
            <SettingsPanel
              settings={printSettings}
              onSettingsChange={setPrintSettings}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Viewer Section - Always mounted but hidden when not active */}
          <div className={`${viewMode === 'viewer' ? 'flex flex-col flex-1' : 'hidden'}`}>
            <PrintTimeDisplay
              estimate={printTimeEstimate}
              slicingMethod={slicingMethod}
              modelVolume={getModelVolume()}
            />
            <ViewerDisplay
              slicingMethod={slicingMethod}
              fileName={fileName}
              isLoading={isLoading}
              error={error}
              onMountReady={initializeScene}
            />
          </div>

          {/* About Section */}
          {viewMode === 'about' && (
            <div className="flex-1 p-4 lg:p-6 bg-gray-100 overflow-y-auto">
              <AboutMe />
            </div>
          )}

          {/* Contact Section */}
          {viewMode === 'contact' && (
            <div className="flex-1 p-4 lg:p-6 bg-gray-100 overflow-y-auto">
              <ContactMe />
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default STLViewer;