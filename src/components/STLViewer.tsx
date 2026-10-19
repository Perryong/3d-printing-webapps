import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Move3D, Settings, Store, PanelLeft, Calculator as CalcIcon } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Components
import FileUpload from './FileUpload';
import SettingsPanel from './SettingsPanel';
import PrintTimeDisplay from './PrintTimeDisplay';
import QuotePanel from './checkout/QuotePanel';
import { createModelSnapshot } from '../utils/modelSnapshot';
import { geometryDimensions, type XYZ } from '../utils/modelDimensions';
import ModelDimensionsEditor from './ModelDimensionsEditor';
import { toPreliminaryJob } from '../utils/printEstimator';
import ViewerControls from './ViewerControls';
import ViewerDisplay from './ViewerDisplay';
import ViewerToolbar from './ViewerToolbar';
import type { DisplayMode } from '../utils/modelManager';
import CameraDirectionIndicator from './CameraDirectionIndicator.tsx';
import AboutMe from './about/AboutMe';
import ContactMe from './contact/ContactMe';
import ModelTransformControls from './ModelTransformControls';
import ModelList from './ModelList';

// Utils
import { loadSTL } from '../utils/stlLoader';
import { estimatePrintTime, PrintSettings, PrintEstimate } from '../utils/printEstimator';
import { analyzeGCode, GCodeAnalysis } from '../utils/gcodeAnalyzer';
import { createScene, SceneRefs, OrbitControls, CameraView } from '../utils/sceneManager';
import { ModelManager, ModelData } from '../utils/modelManager';
import { calculateMeshVolume, convertMmToCm } from '../utils/stlVolumeCalculator';

// Services


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
  const [showModelControls, setShowModelControls] = useState(false);
  const [slicingMethod, setSlicingMethod] = useState<'simplified' | 'gcode'>('simplified');
  const [viewMode, setViewMode] = useState<ViewMode>('viewer');
  const [checkoutFile, setCheckoutFile] = useState<File | null>(null);
  const [modelRevision, setModelRevision] = useState('');
  const [snapshotKey,setSnapshotKey] = useState('');
  const [snapshotBounds, setSnapshotBounds] = useState<XYZ | null>(null);
  const [dimensionDraft, setDimensionDraft] = useState(false);
  const [proportionsLocked, setProportionsLocked] = useState(true);
  const [models, setModels] = useState<ModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'select' | 'move' | 'rotate' | 'scale'>('select');
  
  const [displayMode, setDisplayMode] = useState<DisplayMode>('edges');
  const [dimensionsVisible, setDimensionsVisible] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const inspectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === inspectionRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await inspectionRef.current?.requestFullscreen();
    } catch { toast.error('Fullscreen is unavailable in this browser. Enlarge the browser panel to inspect the model.'); }
  };

  // Camera direction state
  const [cameraAzimuth, setCameraAzimuth] = useState(0);
  const [cameraElevation, setCameraElevation] = useState(0);
  const [isCameraRotating, setIsCameraRotating] = useState(false);

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

  // Camera change handler
  const handleCameraChange = useCallback((azimuth: number, elevation: number, isRotating: boolean) => {
    setCameraAzimuth(azimuth);
    setCameraElevation(elevation);
    setIsCameraRotating(isRotating);
  }, []);

  // Initialize scene
  const initializeScene = useCallback((container: HTMLElement) => {
    try {
      const { refs, controls, animate } = createScene(container, handleCameraChange);
      sceneRefs.current = refs;
      controlsRef.current = controls;
      
      // Initialize model manager
      modelManagerRef.current = new ModelManager(refs.scene, refs.camera, refs.renderer, () => {
        const manager = modelManagerRef.current;
        if (!manager) return;
        setModels([...manager.getAllModels()]);
        setSelectedModelId(manager.getSelectedModel()?.id ?? null);
        refs.mesh = manager.getSelectedModel()?.mesh;
      });
      
      animate();
      
      return () => {
        if (modelManagerRef.current) {
          modelManagerRef.current.dispose();
        }
        refs.dispose();
        sceneRefs.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize scene:', err);
      setError('Failed to initialize 3D viewer');
    }
  }, [handleCameraChange]);

  // Load STL file
  const loadSTLFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    
    try {


      // Files remain local until a deliberate checkout submission.

      const arrayBuffer = await file.arrayBuffer();
      const geometry = loadSTL(arrayBuffer);
      
      if (!sceneRefs.current || !modelManagerRef.current) {
        throw new Error('Scene not initialized');
      }

      // Show the grid when file is uploaded
      if (gridVisible) sceneRefs.current.showGrid();
      else sceneRefs.current.hideGrid();

      // File inspection shows one part at a time; model controls can reveal others.
      modelManagerRef.current.getAllModels().forEach(model => modelManagerRef.current!.setModelVisibility(model.id, false));
      // Create unique model ID
      const modelId = crypto.randomUUID();
      const modelData = modelManagerRef.current.addModel(modelId, file.name, geometry);
      
      // Update models list
      setModels(prev => [...prev, modelData]);
      setSelectedModelId(modelId);
      modelManagerRef.current.selectModel(modelId);
      
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      sceneRefs.current.mesh = modelData.mesh;
      sceneRefs.current.fit(modelData.mesh);

      // Calculate actual mesh volume using proper geometry calculation
      const volumeMm3 = calculateMeshVolume(geometry);
      const volumeCm3 = convertMmToCm(volumeMm3);
      
      dispatch({ type: 'ADD_UPLOADED_FILE', payload: file });
      toast.success(`File "${file.name}" loaded into viewer`);
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
      geometry.dispose();
    } catch (err) {
      setCheckoutFile(null); setSelectedModelId(null);
      setError(err instanceof Error ? err.message : 'Failed to load STL file');
    } finally {
      setIsLoading(false);
    }
  }, [printSettings, slicingMethod, dispatch, gridVisible]);

  // Handle G-code file upload
  const handleGCodeUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Store the file in app context for contact form
      dispatch({ type: 'ADD_UPLOADED_FILE', payload: file });
      toast.success(`File "${file.name}" loaded into viewer`);

      // Files remain local until a deliberate checkout submission.

      const content = await file.text();
      const analysis = analyzeGCode(content);
      setPrintTimeEstimate(analysis);
      setFileName(file.name);
      setSlicingMethod('gcode');
      

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
      modelManagerRef.current.getAllModels().forEach(model => modelManagerRef.current!.setModelVisibility(model.id, model.id === modelId));
      modelManagerRef.current.selectModel(modelId);
      setModels([...modelManagerRef.current.getAllModels()]);
      const model = modelManagerRef.current.getSelectedModel();
      if (model) {
        setSlicingMethod('simplified');
        setFileName(model.name);
        sceneRefs.current?.fit(model.mesh);
      }
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
      if (controlsRef.current) controlsRef.current.enableRotate = mode !== "move";
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
      if (modelManagerRef.current.getSelectedModel()?.locked || !Number.isFinite(value) || (type === "scale" && value <= 0)) return;
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

  const setCameraView = useCallback((view: CameraView) => {
    const manager = modelManagerRef.current;
    const selected = manager?.getSelectedModel();
    if (selected?.visible) {
      sceneRefs.current?.fit(selected.mesh, view);
    } else {
      const visible = manager?.getAllModels().filter(model => model.visible) ?? [];
      const box = new THREE.Box3();
      visible.forEach(model => box.expandByObject(model.mesh));
      // Fit visible models without reparenting the live meshes.
      if (visible.length) {
        const size = box.getSize(new THREE.Vector3());
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z));
        proxy.position.copy(box.getCenter(new THREE.Vector3()));
        sceneRefs.current?.fit(proxy, view);
        proxy.geometry.dispose();
        (proxy.material as THREE.Material).dispose();
      } else sceneRefs.current?.fit(undefined, view);
    }
  }, []);
  const resetCamera = useCallback(() => setCameraView('iso'), [setCameraView]);
  const zoomIn = useCallback(() => sceneRefs.current?.zoom(0.8), []);
  const zoomOut = useCallback(() => sceneRefs.current?.zoom(1.25), []);

  const activeModel = models.find(m => m.id === selectedModelId);
  const geometryKey = JSON.stringify([selectedModelId, activeModel?.transform, slicingMethod]);
  useEffect(() => { setDimensionDraft(false); }, [geometryKey]);
  useEffect(() => { setProportionsLocked(true); }, [selectedModelId]);
  // Ignore late exports after another edit or file selection. Display controls do not rebuild geometry.
  useEffect(() => {
    let active = true;
    setCheckoutFile(null); setModelRevision(''); setSnapshotBounds(null);
    if (slicingMethod !== 'simplified' || !activeModel) {
      if (slicingMethod === 'simplified') { setModelInfo(null); setPrintTimeEstimate(null); }
      return;
    }
    createModelSnapshot(activeModel.mesh, activeModel.name).then(snapshot => {
      try {
        if (!active) return;
        const {geometry,boundsMm:size}=snapshot;
        setModelInfo({vertices: geometry.attributes.position.count,
          triangles: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
          size:{x:size.x.toFixed(2),y:size.y.toFixed(2),z:size.z.toFixed(2)},
          volume:convertMmToCm(calculateMeshVolume(geometry)).toFixed(2)});
        setPrintTimeEstimate(estimatePrintTime(geometry,printSettings));
        setSnapshotKey(geometryKey);setCheckoutFile(snapshot.file);setModelRevision(snapshot.revision);setSnapshotBounds(size);
      } finally { snapshot.geometry.dispose(); }
    }).catch(e=>{if(active) setError('STL export failed: '+e.message);});
    return ()=>{active=false;};
  }, [geometryKey, printSettings]);
  const applyDimensions = (scale:XYZ) => {
    if(!activeModel || activeModel.locked) return;
    modelManagerRef.current?.updateModelTransform(activeModel.id,{scale});
    setModels([...modelManagerRef.current!.getAllModels()]);
    sceneRefs.current?.fit(activeModel.mesh);
  };
  const oversize = snapshotBounds && Object.values(snapshotBounds).some(v=>v>256.001 || v<=0);
  const blockedReason = isLoading || !checkoutFile || snapshotKey!==geometryKey ? 'Upload an STL and wait for its export to request a print quote.'
    : dimensionDraft ? 'Apply or reset your dimension edits before requesting a quote.'
    : oversize ? 'Placed dimensions must fit the A1 build volume (256 × 256 × 256 mm). Resize or rotate before quoting. You can still download the STL.' : '';

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
    <div className="w-full h-dvh bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
            <Move3D className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
            <span className="hidden sm:inline">3D Print Services Platform</span>
            <span className="sm:hidden">3D Print Services</span>
          </h1>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
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
                aria-label="About"
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
                aria-label="Contact"
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
            
            {viewMode === 'viewer' && (
              <button
                aria-expanded={showModelControls}
                aria-controls="model-controls"
                onClick={() => {
                  setShowModelControls(!showModelControls);
                  if (showModelControls) handleTransformModeChange('select');
                }}
                className="px-3 py-2 rounded-lg flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                <PanelLeft className="w-4 h-4" />
                {showModelControls ? 'Hide controls' : 'Show controls'}
              </button>
            )}

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
            
          </div>
        </div>
        
        {/* File Info */}
        {fileName && (
          <div className="mt-3 text-sm text-gray-300">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              <span><span className="font-semibold">File:</span> {slicingMethod === 'simplified' ? selectedModel?.name ?? fileName : fileName}</span>
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
        {viewMode === 'viewer' && showModelControls && (
          <div id="model-controls" className="w-48 sm:w-60 lg:w-64 bg-gray-900 border-r border-gray-700 p-2 lg:p-4 space-y-4 overflow-y-auto flex-shrink-0">
            <button className="w-full rounded border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" onClick={() => handleTransformModeChange('select')}>
              Orbit / select
            </button>
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
              key={selectedModelId}
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
          <div className="flex-shrink-0 w-64">
            <SettingsPanel
              settings={printSettings}
              onSettingsChange={setPrintSettings}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Viewer Section - Always mounted but hidden when not active */}
          <div className={`${viewMode === 'viewer' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}`}>
            <details className="shrink-0 bg-gray-800 text-gray-300">
              <summary className="cursor-pointer px-4 py-2 text-xs">Print estimate & pricing</summary>
            <PrintTimeDisplay
              estimate={printTimeEstimate}
              slicingMethod={slicingMethod}
              modelVolume={getModelVolume()}
              cameraAzimuth={cameraAzimuth}
              cameraElevation={cameraElevation}
              isCameraRotating={isCameraRotating}
            />
            </details>
            <details className="shrink-0 border-b bg-white text-slate-800">
              <summary className="sticky top-0 z-10 cursor-pointer bg-white px-4 py-2 text-sm font-semibold">Customize STL dimensions</summary>
              <div>
              {slicingMethod === 'gcode' ? <p>G-code is read-only analysis. Upload the original STL model to customize or request a print quote.</p> : activeModel ? <>
                <ModelDimensionsEditor key={geometryKey} model={activeModel} locked={proportionsLocked} onApply={applyDimensions} onDirty={setDimensionDraft} onLockChange={setProportionsLocked}
                  downloadDisabled={!checkoutFile || dimensionDraft || isLoading || snapshotKey!==geometryKey}
                  onDownload={()=>{
                    if(!checkoutFile)return; const url=URL.createObjectURL(checkoutFile);const a=document.createElement('a');a.href=url;a.download=checkoutFile.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
                  }}>
                {snapshotBounds && <p>Placed build dimensions: {Object.values(snapshotBounds).map(n=>n.toFixed(2)).join(' × ')} mm</p>}
                {oversize && <p role="alert" className="text-amber-800">Outside the A1 build volume. Download is available; quoting is blocked.</p>}
                </ModelDimensionsEditor>
              </> : <p>Upload an STL to edit overall dimensions.</p>}
              </div>
            </details>
            <QuotePanel blockedReason={blockedReason} customization={activeModel && slicingMethod === 'simplified' ? {
              sourceName:activeModel.name,originalBoundsMm:geometryDimensions(activeModel.originalGeometry),
              editedBoundsMm:Object.fromEntries(Object.entries(geometryDimensions(activeModel.originalGeometry)).map(([a,v])=>[a,v*activeModel.transform.scale[a as keyof XYZ]])) as XYZ,
              scale:activeModel.transform.scale,proportionsLocked
            }:undefined} job={printTimeEstimate && slicingMethod === 'simplified' ? toPreliminaryJob(printTimeEstimate, 1) : null} modelFile={checkoutFile} modelRevision={modelRevision} inspecting={fullscreen} />
            <div ref={inspectionRef} className="relative flex min-h-0 flex-1 flex-col bg-slate-100" data-testid="inspection-viewer">
            <ViewerToolbar mode={displayMode} onModeChange={mode => { setDisplayMode(mode); modelManagerRef.current?.setDisplayMode(mode); }}
              dimensions={dimensionsVisible} grid={gridVisible}
              onDimensionsChange={() => { setDimensionsVisible(!dimensionsVisible); sceneRefs.current?.setDimensionsVisible(!dimensionsVisible); }}
              onGridChange={() => { setGridVisible(!gridVisible); if (gridVisible) sceneRefs.current?.hideGrid(); else sceneRefs.current?.showGrid(); }}
              fullscreen={fullscreen} onFullscreen={toggleFullscreen} />
            <div className="relative flex min-h-0 flex-1 flex-col">
            {fileName && slicingMethod !== 'gcode' && <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)] rounded-lg bg-white/90 p-1 shadow-sm">
              <ViewerControls onZoomIn={zoomIn} onZoomOut={zoomOut} onResetCamera={resetCamera} onViewChange={setCameraView} />
            </div>}
            <ViewerDisplay
              slicingMethod={slicingMethod}
              fileName={fileName}
              isLoading={isLoading}
              error={error}
              onMountReady={initializeScene}
            />
            </div>
            {models.length > 0 && <div className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-2 text-slate-700">
              <button className="min-h-10 rounded border px-3 disabled:opacity-30" aria-label="Previous file" disabled={models.findIndex(m => m.id === selectedModelId) <= 0} onClick={() => handleModelSelect(models[models.findIndex(m => m.id === selectedModelId) - 1].id)}>‹</button>
              <select aria-label="Selected file" className="min-h-10 min-w-0 flex-1 rounded border bg-white p-2 text-sm" value={selectedModelId ?? ''} onChange={event => handleModelSelect(event.target.value)}>
                <option value="" disabled>Select a model</option>
                {models.map(model => <option value={model.id} key={model.id}>{model.name}</option>)}
              </select>
              <button className="min-h-10 rounded border px-3 disabled:opacity-30" aria-label="Next file" disabled={models.findIndex(m => m.id === selectedModelId) >= models.length - 1} onClick={() => handleModelSelect(models[models.findIndex(m => m.id === selectedModelId) + 1].id)}>›</button>
            </div>}
            </div>
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