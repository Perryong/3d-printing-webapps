# 3D Print Services Platform

A comprehensive 3D printing platform featuring STL file visualization, print time estimation, and model management tools. Built with React, TypeScript, and Three.js, optimized for Bambu Lab A1 printer specifications.

## ✨ Features

### 📁 File Support
- **STL Files**: 3D model visualization with interactive viewing
- **G-code Files**: Accurate print time analysis from sliced files
- **Binary STL Parser**: Custom implementation for reliable file processing

### 🎮 3D Viewer
- **Interactive Controls**: Mouse drag to rotate, wheel to zoom
- **Multi-Model Management**: Load and manage multiple models simultaneously
- **Transform Tools**: Move, rotate, scale models with precision controls
- **Build Platform**: Visual 256×256×256mm build volume representation
- **Model Operations**: Duplicate, delete, show/hide, lock/unlock models

### ⏱️ Print Time Estimation
- **Bambu Lab A1 Optimized**: Calculations based on actual printer specifications
- **Detailed Breakdown**: Outer walls, infill, travel time, and overhead analysis
- **Material Usage**: Accurate filament length, weight, and volume calculations
- **Quality Profiles**: Draft, Standard, Fine, and Ultra Fine presets

### ⚙️ Advanced Settings
- **Print Profiles**: PLA, ABS, PETG, TPU material presets
- **Speed Configuration**: Customizable print speeds for different elements
- **Advanced Parameters**: Retraction, Z-hop, combing, ironing settings
- **Real-time Updates**: Live print time recalculation as settings change

### 🎨 User Interface
- **Modern Design**: Clean, professional interface with dark/light themes
- **Responsive Layout**: Adapts to different screen sizes
- **Tabbed Settings**: Organized configuration panels
- **Visual Feedback**: Loading states, error handling, and status indicators

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **3D Graphics**: Three.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Icons**: Lucide React
- **State Management**: React Context + useReducer

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd stl-viewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## 📖 Usage

### Loading Models
1. Click "Upload File" to load STL or G-code files
2. Supported formats: `.stl`, `.gcode`, `.g`
3. Models appear in the left panel for management

### 3D Navigation
- **Rotate**: Left-click and drag (or Ctrl+drag)
- **Zoom**: Mouse wheel
- **Pan**: Model transform tools in move mode

### Print Estimation
1. Load an STL file
2. Configure print settings in the Settings panel
3. View real-time print time and material usage estimates
4. Use quality presets for quick configuration

### Model Management
- **Select**: Click on models in the viewer or model list
- **Transform**: Use Move/Rotate/Scale tools
- **Duplicate**: Create copies with offset positioning
- **Visibility**: Show/hide models individually
- **Lock**: Prevent accidental modifications

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── STLViewer.tsx    # Main viewer component
│   ├── SettingsPanel.tsx # Print configuration
│   ├── ModelList.tsx    # Model management
│   └── ui/              # shadcn/ui components
├── utils/               # Utility functions
│   ├── stlLoader.ts     # STL file parsing
│   ├── gcodeAnalyzer.ts # G-code analysis
│   ├── printEstimator.ts # Print time calculations
│   └── sceneManager.ts  # Three.js scene setup
├── constants/           # Configuration constants
│   └── printerSpecs.ts  # Bambu Lab A1 specifications
└── types/              # TypeScript type definitions
```

## 🖨️ Bambu Lab A1 Specifications

The platform is optimized for the Bambu Lab A1 printer with these specifications:
- **Build Volume**: 256 × 256 × 256 mm
- **Maximum Speed**: 500 mm/s
- **Maximum Acceleration**: 10,000 mm/s²
- **Nozzle Diameter**: 0.4 mm
- **Filament Diameter**: 1.75 mm

## 🔧 Configuration

### Print Settings
- **Layer Height**: 0.05 - 0.35 mm
- **Infill Density**: 0 - 100%
- **Print Speeds**: Configurable for walls, infill, and travel
- **Temperature Control**: Hotend and bed temperature settings

### Advanced Features
- **Material Profiles**: Optimized settings for different filaments
- **Quality Presets**: One-click configuration for different print qualities
- **Support Generation**: Toggle support material calculation
- **Build Plate Adhesion**: Raft and brim options

## 🚀 Deployment

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Ensure proper MIME types for `.stl` files if serving STL files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📝 Development Notes

### Local Development
- Hot reloading enabled for fast development
- TypeScript strict mode for type safety
- ESLint and Prettier configured for code quality

### Browser Support
- Modern browsers with WebGL support required
- File API support for local file loading
- ES2020+ JavaScript features used


## CAD-style STL inspection

The STL workspace uses neutral grey shading with sharp-edge outlines. Blue edges
identify the selected part. Front, top, right and fit-isometric controls use
orthographic projection; drag to orbit, right-drag to pan, and scroll to zoom.
Choose **Move** for dragging a part on the bed, then **Orbit / select** to resume
camera rotation. Numeric rotation and scale controls remain available.

Dimension callouts show the selected part's **world-aligned overall bounds**:
width, depth and height. They update after transforms and disappear when the part
is hidden or deleted. STL coordinates are assumed to be millimetres; these are
mesh bounds, not CAD feature measurements. The display uses Y-up internally and
converts STL Z-up geometry when placing it on the printer bed.

Design references: [three-cad-viewer](https://github.com/bernhard-42/three-cad-viewer)
(separate surfaces/edges and preset cameras) and
[chili3d](https://github.com/xiangechen/chili3d) (orthographic camera and target-based
navigation). Neither library is added as a dependency. STEP/CAD inspection is deferred.

Verification:

- `npm test` checks model placement, duplication, reset, selection and scale validation.
- `npm run build` builds the application.
- With `npm run dev` running, open `/tests/viewer.html` for browser/WebGL checks of
  camera fitting, zoom, dimension updates, resize and cleanup. The page title reports PASS or FAIL.
