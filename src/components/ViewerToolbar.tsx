import type { DisplayMode } from '../utils/modelManager';

interface Props {
  mode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  dimensions: boolean;
  grid: boolean;
  onDimensionsChange: () => void;
  onGridChange: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
}

export default function ViewerToolbar(props: Props) {
  const modes: [DisplayMode, string][] = [['solid', 'Grey solid'], ['edges', 'Solid + edges'], ['wireframe', 'Wireframe'], ['xray', 'X-ray']];
  const button = 'min-h-10 rounded px-3 py-2 text-xs font-medium aria-pressed:bg-blue-600 aria-pressed:text-white hover:bg-slate-200';
  return <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white p-2 text-slate-700" aria-label="Display controls">
    {modes.map(([mode, label]) => <button className={button} key={mode} aria-pressed={props.mode === mode} onClick={() => props.onModeChange(mode)}>{label}</button>)}
    <span className="mx-1 h-6 border-l border-slate-200" />
    <button className={button} aria-pressed={props.dimensions} onClick={props.onDimensionsChange}>Dimensions</button>
    <button className={button} aria-pressed={props.grid} onClick={props.onGridChange}>Grid</button>
    <button className={`${button} ml-auto`} onClick={props.onFullscreen}>{props.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
    {props.mode === 'xray' && <p className="w-full px-2 text-xs text-slate-500">Transparency preview only — does not check internal clearances.</p>}
  </div>;
}
