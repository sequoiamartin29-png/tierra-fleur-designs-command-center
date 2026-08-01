import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './designStudioWorkspace.css';
import {
  DESIGN_CANVAS_HEIGHT,
  DESIGN_CANVAS_WIDTH,
  DESIGN_COLORS,
  DESIGN_HISTORY_LIMIT,
  DESIGN_STATUS_OPTIONS,
  MATERIAL_PATTERNS,
  applyDesignTemplate,
  compareDesignVersions,
  createDesignObject,
  createDesignVersion,
  designCostSummary,
  measurementLabel,
  spacingNotice,
} from './designEngine.js';
import { addTimelineEvent, createProjectPlantRecord } from './projectEngine.js';

const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const clone = value => JSON.parse(JSON.stringify(value));
const records = value => Array.isArray(value) ? value : [];
const number = value => Number(value || 0);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number(value));
const dateLabel = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not saved';
const active = item => !item.archived;
const selectedTextInput = target => target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

const TOOLS = [
  ['select', 'Select', 'V'],
  ['pen', 'Pen', 'P'],
  ['highlighter', 'Highlighter', 'H'],
  ['line', 'Line', 'L'],
  ['arrow', 'Arrow', 'A'],
  ['rectangle', 'Rectangle', 'R'],
  ['circle', 'Circle', 'C'],
  ['polygon', 'Bed outline', 'B'],
  ['eraser', 'Eraser', 'E'],
  ['text', 'Text label', 'T'],
  ['measurement', 'Measure', 'M'],
  ['plant', 'Plant', 'G'],
  ['material', 'Material', 'K'],
  ['overlay', 'Overlay', 'O'],
  ['feature', 'Feature', 'F'],
  ['pan', 'Pan', 'Space'],
];

const SYMBOLS = [
  ['canopy', 'Canopy circle'],
  ['shrub', 'Shrub circle'],
  ['perennial-cluster', 'Perennial cluster'],
  ['groundcover', 'Groundcover patch'],
  ['vine', 'Vine marker'],
  ['container', 'Container marker'],
  ['raised-bed', 'Raised-bed marker'],
  ['tree', 'Tree icon'],
  ['fruit-tree', 'Fruit-tree icon'],
  ['herb', 'Herb icon'],
  ['vegetable', 'Vegetable icon'],
  ['custom', 'Custom image marker'],
];

const MATERIAL_TYPES = [
  'Mulch', 'Gravel', 'Stone', 'Pavers', 'Edging', 'Soil', 'Compost', 'Raised bed',
  'Trellis', 'Container', 'Irrigation', 'Lighting', 'Decorative feature', 'Structure', 'Custom material',
];

const SUN_OPTIONS = ['Full Sun', 'Part Sun', 'Part Shade', 'Shade', 'Morning Sun', 'Afternoon Sun', 'Unknown'];
const SITE_OPTIONS = ['Wet area', 'Dry area', 'Poor drainage', 'Slope', 'Wind exposure', 'Utility concern', 'Existing roots', 'Compacted soil', 'High-traffic area', 'Pet area', 'Child-use area', 'Accessibility route', 'Do not plant'];
const FEATURE_OPTIONS = ['House', 'Porch', 'Driveway', 'Sidewalk', 'Fence', 'Gate', 'Shed', 'Tree', 'Existing bed', 'Utility box', 'Downspout', 'Air conditioner', 'Patio', 'Deck', 'Pool', 'Play area', 'Pet area', 'Custom feature'];
const NOTE_CATEGORIES = ['Client Request', 'Revision', 'Site Condition', 'Plant Choice', 'Material Choice', 'Budget', 'Installation', 'Maintenance', 'Private', 'Other'];

function layerForName(layers, name) {
  return layers.find(item => item.name === name && !item.archived) || layers.find(active) || null;
}

function objectLayerName(object, layers) {
  return layers.find(item => item.layerId === object.layerId)?.name || 'Unassigned';
}

function patternStyle(pattern) {
  if (pattern === 'gravel') return { fill: '#d5cec0', strokeDasharray: '2 8' };
  if (pattern === 'stone') return { fill: '#c7bdb0', strokeDasharray: '12 5' };
  if (pattern === 'grass') return { fill: '#9aab86', strokeDasharray: '3 5' };
  if (pattern === 'water') return { fill: '#9eb9c2', strokeDasharray: '18 8' };
  if (pattern === 'soil') return { fill: '#a77c62', strokeDasharray: '7 5' };
  if (pattern === 'pavers') return { fill: '#c9bda9', strokeDasharray: '18 3' };
  if (pattern === 'raised-bed') return { fill: '#9b704d', strokeDasharray: '22 4' };
  if (pattern === 'mulch') return { fill: '#866148', strokeDasharray: '4 7' };
  return {};
}

function pathData(points = []) {
  if (!points.length) return '';
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function SymbolMark({ symbol }) {
  const mark = {
    canopy: '✤',
    shrub: '❉',
    'perennial-cluster': '⁕',
    groundcover: '❈',
    vine: '⌁',
    container: '♢',
    'raised-bed': '▱',
    tree: '♧',
    'fruit-tree': '♣',
    herb: '❧',
    vegetable: '✣',
    custom: '✦',
  }[symbol] || '✤';
  return <>{mark}</>;
}

function ObjectGraphic({ object, selected = false, compact = false }) {
  const style = object.style || {};
  const stroke = style.stroke || DESIGN_COLORS.olive;
  const fill = style.fill || DESIGN_COLORS.cream;
  const width = Math.max(8, number(object.width));
  const height = Math.max(8, number(object.height));
  const dash = style.lineStyle === 'dashed' ? '14 9' : style.lineStyle === 'dotted' ? '3 8' : undefined;
  const shared = {
    stroke,
    strokeWidth: number(style.strokeWidth) || 4,
    strokeOpacity: style.strokeOpacity ?? 1,
    fill,
    fillOpacity: style.fillOpacity ?? 0.2,
    strokeDasharray: dash,
    vectorEffect: 'non-scaling-stroke',
  };
  const pattern = patternStyle(style.pattern);

  if (['drawing', 'highlighter'].includes(object.objectType)) {
    return <path d={pathData(object.points)} fill="none" stroke={stroke} strokeWidth={number(style.strokeWidth) || (object.objectType === 'highlighter' ? 18 : 4)} strokeOpacity={object.objectType === 'highlighter' ? 0.35 : style.strokeOpacity ?? 1} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
  }
  if (['line', 'arrow', 'measurement'].includes(object.objectType)) {
    return <>
      <line x1="0" y1="0" x2={width} y2={height} {...shared} fill="none" markerEnd={object.objectType === 'arrow' ? 'url(#design-arrowhead)' : undefined} />
      {object.objectType === 'measurement' && <text x={width / 2} y={height / 2 - 10} textAnchor="middle" className="scene-measurement-text">{object.displayLabel || object.label}</text>}
    </>;
  }
  if (object.objectType === 'label' || object.objectType === 'annotation') {
    return <>
      <rect width={width} height={height} rx="10" fill={fill} fillOpacity={Math.max(0.12, style.fillOpacity ?? 0.74)} stroke={selected ? DESIGN_COLORS.gold : stroke} strokeWidth={selected ? 3 : 1.5} />
      <text x={width / 2} y={height / 2} dominantBaseline="middle" textAnchor="middle" fill={stroke} fontSize={Math.min(number(style.fontSize) || 24, height * 0.62)} className="scene-label-text">{object.label || 'Label'}</text>
    </>;
  }
  if (object.objectType === 'plant') {
    return <>
      <circle cx={width / 2} cy={height / 2} r={Math.max(8, Math.min(width, height) / 2 - 3)} fill={fill} fillOpacity={style.fillOpacity ?? 0.42} stroke={stroke} strokeWidth={selected ? 5 : 3} strokeDasharray={dash} />
      <text x={width / 2} y={height / 2 + 3} dominantBaseline="middle" textAnchor="middle" fill={stroke} fontSize={Math.max(20, Math.min(width, height) * 0.48)}><SymbolMark symbol={style.symbol} /></text>
      {style.showLabel !== false && !compact && <text x={width / 2} y={height + 22} textAnchor="middle" fill={DESIGN_COLORS.charcoal} fontSize="18" className="scene-object-label">{object.label || 'Plant'}</text>}
      {number(style.quantity) > 1 && <g><circle cx={width - 5} cy="7" r="14" fill={DESIGN_COLORS.deepGreen} /><text x={width - 5} y="8" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13">×{style.quantity}</text></g>}
    </>;
  }
  if (object.objectType === 'circle') return <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} {...shared} />;
  if (['polygon', 'material'].includes(object.objectType)) {
    const points = records(object.points).length >= 3
      ? object.points.map(point => `${point.x},${point.y}`).join(' ')
      : `0,${height * 0.22} ${width * 0.32},0 ${width},${height * 0.18} ${width * 0.88},${height} ${width * 0.12},${height * 0.86}`;
    return <>
      <polygon points={points} {...shared} {...pattern} fillOpacity={style.fillOpacity ?? 0.3} />
      {!compact && object.label && <text x={width / 2} y={height / 2} dominantBaseline="middle" textAnchor="middle" fill={stroke} fontSize="20" className="scene-object-label">{object.label}</text>}
    </>;
  }
  if (object.objectType === 'overlay') {
    return <>
      <rect width={width} height={height} rx="40" fill={fill} fillOpacity={style.fillOpacity ?? 0.26} stroke={stroke} strokeWidth={selected ? 5 : 2} strokeDasharray="14 8" />
      {!compact && <text x={width / 2} y={height / 2} dominantBaseline="middle" textAnchor="middle" fill={stroke} fontSize="22" className="scene-object-label">{object.label}</text>}
    </>;
  }
  return <>
    <rect width={width} height={height} rx={object.objectType === 'structure' ? 5 : 16} {...shared} {...pattern} />
    {!compact && object.label && <text x={width / 2} y={height / 2} dominantBaseline="middle" textAnchor="middle" fill={stroke} fontSize="20" className="scene-object-label">{object.label}</text>}
  </>;
}

export function DesignScene({
  objects,
  layers,
  settings,
  photos,
  selectedId = '',
  onObjectPointerDown,
  onObjectClick,
  clientSafe = false,
  compact = false,
  interactive = false,
  sceneRef,
  tempObject,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const orderedLayers = records(layers).filter(active).sort((a, b) => number(a.order) - number(b.order));
  const allowedLayers = new Set(orderedLayers.filter(layer => layer.visible !== false && (!clientSafe || (layer.clientVisible && layer.presentationVisible !== false))).map(layer => layer.layerId));
  const visibleObjects = records(objects)
    .filter(item => active(item) && item.visible !== false && allowedLayers.has(item.layerId) && (!clientSafe || (item.clientVisible && item.exportEnabled !== false)))
    .sort((a, b) => number(a.zIndex) - number(b.zIndex));
  const photo = records(photos).find(item => (item.photoId || item.id) === settings?.backgroundPhotoId || item.id === settings?.backgroundPhotoId);
  const zoom = number(settings?.viewportZoom) || 1;
  const viewWidth = DESIGN_CANVAS_WIDTH / zoom;
  const viewHeight = DESIGN_CANVAS_HEIGHT / zoom;
  const viewX = -number(settings?.viewportPanX) + (DESIGN_CANVAS_WIDTH - viewWidth) / 2;
  const viewY = -number(settings?.viewportPanY) + (DESIGN_CANVAS_HEIGHT - viewHeight) / 2;
  const fit = settings?.backgroundFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
  const imageWidth = DESIGN_CANVAS_WIDTH * (number(settings?.backgroundZoom) || 1);
  const imageHeight = DESIGN_CANVAS_HEIGHT * (number(settings?.backgroundZoom) || 1);
  const imageX = (DESIGN_CANVAS_WIDTH - imageWidth) / 2 + number(settings?.backgroundPanX);
  const imageY = (DESIGN_CANVAS_HEIGHT - imageHeight) / 2 + number(settings?.backgroundPanY);
  const matureLayer = orderedLayers.find(layer => layer.name === 'Mature Spread');
  const pixelsPerFoot = number(settings?.scaleCalibration?.pixelsPerFoot);
  const photoClientSafe = Boolean(photo?.safeForPresentation || (photo?.clientVisible && photo?.presentationVisible && photo?.private !== true && photo?.internal !== true));

  return <svg
    ref={sceneRef}
    className={`design-scene${interactive ? ' interactive' : ''}`}
    viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
    preserveAspectRatio="xMidYMid meet"
    role={interactive ? 'application' : 'img'}
    aria-label={interactive ? 'Interactive landscape design canvas' : 'Landscape design preview'}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp}
  >
    <defs>
      <marker id="design-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={DESIGN_COLORS.olive} /></marker>
      <pattern id="design-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#77826f" strokeOpacity=".24" strokeWidth="1" /></pattern>
    </defs>
    <rect width={DESIGN_CANVAS_WIDTH} height={DESIGN_CANVAS_HEIGHT} fill="#fff9ed" />
    {photo && settings?.backgroundVisible !== false && (!clientSafe || photoClientSafe) && <image
      href={photo.image}
      x={imageX}
      y={imageY}
      width={imageWidth}
      height={imageHeight}
      opacity={settings?.backgroundOpacity ?? 0.82}
      preserveAspectRatio={fit}
      transform={`rotate(${number(settings?.backgroundRotation)} ${DESIGN_CANVAS_WIDTH / 2} ${DESIGN_CANVAS_HEIGHT / 2})`}
    data-client-visible={photoClientSafe ? 'true' : 'false'}
    />}
    {settings?.gridVisible && !clientSafe && <rect width={DESIGN_CANVAS_WIDTH} height={DESIGN_CANVAS_HEIGHT} fill="url(#design-grid-pattern)" pointerEvents="none" />}
    {matureLayer?.visible !== false && visibleObjects.filter(item => item.objectType === 'plant').map(object => {
      const spreadFeet = number(object.style?.customSpreadFeet || object.style?.matureSpreadFeet);
      const show = spreadFeet > 0 && (settings?.showAllMatureSpread || object.style?.showMatureSpread);
      if (!show || !pixelsPerFoot) return null;
      const radius = spreadFeet * pixelsPerFoot / 2;
      return <circle key={`spread-${object.objectId}`} cx={number(object.x) + number(object.width) / 2} cy={number(object.y) + number(object.height) / 2} r={radius} fill={DESIGN_COLORS.olive} fillOpacity=".08" stroke={DESIGN_COLORS.olive} strokeOpacity=".45" strokeDasharray="10 8" strokeWidth="2" pointerEvents="none" />;
    })}
    {visibleObjects.map(object => {
      const displayObject = object.objectType === 'measurement' ? { ...object, displayLabel: measurementLabel(object, settings) } : object;
      return <g
        key={object.objectId}
        className={`design-scene-object${selectedId === object.objectId ? ' selected' : ''}${object.locked ? ' locked' : ''}`}
        transform={`translate(${number(object.x)} ${number(object.y)}) rotate(${number(object.rotation)} ${number(object.width) / 2} ${number(object.height) / 2})`}
        opacity={object.opacity ?? 1}
        data-object-id={object.objectId}
        data-client-visible={object.clientVisible ? 'true' : 'false'}
        data-export-enabled={object.exportEnabled !== false ? 'true' : 'false'}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `${object.label || object.objectType}${object.locked ? ', locked' : ''}` : undefined}
        onPointerDown={interactive ? event => onObjectPointerDown?.(event, object) : undefined}
        onClick={interactive ? event => { event.stopPropagation(); onObjectClick?.(object); } : undefined}
        onFocus={interactive ? () => onObjectClick?.(object) : undefined}
      >
        <ObjectGraphic object={displayObject} selected={selectedId === object.objectId} compact={compact} />
        {selectedId === object.objectId && interactive && !object.locked && <>
          <rect className="design-selection-outline" x="-8" y="-8" width={number(object.width) + 16} height={number(object.height) + 16} rx="6" fill="none" stroke={DESIGN_COLORS.gold} strokeWidth="3" strokeDasharray="8 5" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          <circle className="design-resize-handle" cx={number(object.width) + 8} cy={number(object.height) + 8} r="11" fill={DESIGN_COLORS.gold} stroke="white" strokeWidth="3" data-resize-object={object.objectId} />
        </>}
      </g>;
    })}
    {tempObject && <g transform={`translate(${number(tempObject.x)} ${number(tempObject.y)})`} opacity=".75" pointerEvents="none"><ObjectGraphic object={tempObject} /></g>}
  </svg>;
}

function WorkspaceToolbar({ tool, setTool, undo, redo, canUndo, canRedo, zoom, setZoom, consultation }) {
  return <div className="design-workspace-toolbar" role="toolbar" aria-label="Design drawing tools">
    <div className="design-tool-scroll">
      {TOOLS.filter(([id]) => !consultation || ['select', 'pen', 'line', 'rectangle', 'text', 'measurement', 'plant', 'material', 'pan'].includes(id)).map(([id, label, shortcut]) => <button
        key={id}
        type="button"
        className={tool === id ? 'active' : ''}
        aria-pressed={tool === id}
        title={`${label} (${shortcut})`}
        onClick={() => setTool(id)}
      ><span aria-hidden="true">{{
        select: '↖', pen: '✎', highlighter: '▰', line: '╱', arrow: '➜', rectangle: '□', circle: '○',
        polygon: '⬡', eraser: '⌫', text: 'T', measurement: '↔', plant: '✤', material: '▧', overlay: '◒',
        feature: '⌂', pan: '✋',
      }[id]}</span><small>{label}</small></button>)}
    </div>
    <div className="design-history-controls">
      <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl or Command Z)">↶ <span>Undo</span></button>
      <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl or Command Y)">↷ <span>Redo</span></button>
      <button type="button" onClick={() => setZoom(Math.max(.4, zoom - .1))} aria-label="Zoom out">−</button>
      <output aria-label="Canvas zoom">{Math.round(zoom * 100)}%</output>
      <button type="button" onClick={() => setZoom(Math.min(2.4, zoom + .1))} aria-label="Zoom in">+</button>
    </div>
  </div>;
}

function LayerManager({ layers, objects, updateLayers, selectLayer, selectedLayerId }) {
  const [renaming, setRenaming] = useState('');
  const patch = (layerId, changes, reason = 'Layer changed') => updateLayers(layers.map(item => item.layerId === layerId ? { ...item, ...changes, updatedAt: now() } : item), reason);
  const move = (layer, direction) => {
    const ordered = [...layers].sort((a, b) => number(a.order) - number(b.order));
    const index = ordered.findIndex(item => item.layerId === layer.layerId);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    updateLayers(ordered.map((item, order) => ({ ...item, order })), 'Layer reordered');
  };
  const duplicate = layer => {
    const layerId = uid('design-layer');
    updateLayers([...layers, { ...layer, id: layerId, layerId, name: `${layer.name} copy`, order: layers.length, createdAt: now(), updatedAt: now(), archived: false }], 'Layer duplicated');
  };
  const archive = layer => {
    const count = objects.filter(item => item.layerId === layer.layerId && active(item)).length;
    if (count && !confirm(`${layer.name} contains ${count} object${count === 1 ? '' : 's'}. Archive the layer and hide those objects?`)) return;
    if (!count && !confirm(`Archive ${layer.name}?`)) return;
    patch(layer.layerId, { archived: true, visible: false }, 'Layer archived');
  };
  return <aside className="studio-layer-manager glass" aria-label="Design layers">
    <div className="studio-panel-heading"><div><span>Layer manager</span><h3>Garden layers</h3></div><small>{layers.filter(active).length} active</small></div>
    <div className="studio-layer-list">
      {[...layers].filter(active).sort((a, b) => number(a.order) - number(b.order)).map(layer => <article key={layer.layerId} className={selectedLayerId === layer.layerId ? 'active' : ''} onClick={() => selectLayer(layer.layerId)}>
        <button type="button" className="layer-visibility" aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} onClick={event => { event.stopPropagation(); patch(layer.layerId, { visible: !layer.visible }); }}>{layer.visible ? '◉' : '○'}</button>
        <button type="button" className="layer-lock" aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`} onClick={event => { event.stopPropagation(); patch(layer.layerId, { locked: !layer.locked }); }}>{layer.locked ? '🔒' : '◇'}</button>
        <div>
          {renaming === layer.layerId
            ? <input autoFocus value={layer.name} onChange={event => patch(layer.layerId, { name: event.target.value }, 'Layer renamed')} onBlur={() => setRenaming('')} onKeyDown={event => event.key === 'Enter' && setRenaming('')} />
            : <strong>{layer.name}</strong>}
          <small>{objects.filter(item => item.layerId === layer.layerId && active(item)).length} objects · {layer.clientVisible ? 'Client layer' : 'Internal'}</small>
        </div>
        <details onClick={event => event.stopPropagation()}>
          <summary aria-label={`Layer actions for ${layer.name}`}>•••</summary>
          <div>
            <button type="button" onClick={() => setRenaming(layer.layerId)}>Rename</button>
            <button type="button" onClick={() => move(layer, -1)}>Move up</button>
            <button type="button" onClick={() => move(layer, 1)}>Move down</button>
            <button type="button" onClick={() => duplicate(layer)}>Duplicate</button>
            <label><input type="checkbox" checked={layer.clientVisible} onChange={() => patch(layer.layerId, { clientVisible: !layer.clientVisible, presentationVisible: !layer.clientVisible })} /> Client-visible</label>
            <label><input type="checkbox" checked={layer.exportEnabled} onChange={() => patch(layer.layerId, { exportEnabled: !layer.exportEnabled })} /> Export</label>
            <button type="button" onClick={() => archive(layer)}>Archive</button>
          </div>
        </details>
      </article>)}
    </div>
  </aside>;
}

function ObjectInspector({ object, layers, objects, settings, patchObject, duplicateObject, deleteObject, moveZ, calibrate }) {
  if (!object) return <aside className="studio-object-inspector glass"><div className="studio-panel-heading"><div><span>Selection</span><h3>Object details</h3></div></div><div className="studio-empty-inspector"><span aria-hidden="true">✦</span><p>Tap an object to edit its label, style, layer, size, privacy, and linked records.</p></div></aside>;
  const notice = spacingNotice(object, objects, settings);
  return <aside className="studio-object-inspector glass">
    <div className="studio-panel-heading"><div><span>{object.objectType}</span><h3>{object.label || 'Selected object'}</h3></div><span className={object.locked ? 'status-chip rose' : 'status-chip olive'}>{object.locked ? 'Locked' : 'Editable'}</span></div>
    <div className="object-inspector-scroll">
      <label>Label<input value={object.label} onChange={event => patchObject({ label: event.target.value }, 'Label changed')} /></label>
      <label>Layer<select value={object.layerId} onChange={event => patchObject({ layerId: event.target.value }, 'Layer changed')}>{layers.filter(active).map(layer => <option key={layer.layerId} value={layer.layerId}>{layer.name}</option>)}</select></label>
      <div className="inspector-grid">
        <label>Width<input type="number" min="8" value={Math.round(object.width)} onChange={event => patchObject({ width: Math.max(8, number(event.target.value)) }, 'Object resized')} /></label>
        <label>Height<input type="number" min="8" value={Math.round(object.height)} onChange={event => patchObject({ height: Math.max(8, number(event.target.value)) }, 'Object resized')} /></label>
        <label>Rotation<input type="number" min="-180" max="180" value={object.rotation} onChange={event => patchObject({ rotation: number(event.target.value) }, 'Object rotated')} /></label>
        <label>Opacity<input type="range" min=".1" max="1" step=".05" value={object.opacity} onChange={event => patchObject({ opacity: number(event.target.value) }, 'Object opacity changed')} /></label>
      </div>
      <div className="inspector-grid">
        <label>Stroke<select value={object.style.stroke} onChange={event => patchObject({ style: { ...object.style, stroke: event.target.value } }, 'Style changed')}>{Object.entries(DESIGN_COLORS).map(([name, value]) => <option key={name} value={value}>{name.replace(/([A-Z])/g, ' $1')}</option>)}</select></label>
        <label>Stroke width<input type="range" min="1" max="18" value={object.style.strokeWidth || 4} onChange={event => patchObject({ style: { ...object.style, strokeWidth: number(event.target.value) } }, 'Style changed')} /></label>
        <label>Fill opacity<input type="range" min="0" max=".85" step=".05" value={object.style.fillOpacity ?? .2} onChange={event => patchObject({ style: { ...object.style, fillOpacity: number(event.target.value) } }, 'Style changed')} /></label>
        <label>Line style<select value={object.style.lineStyle || 'solid'} onChange={event => patchObject({ style: { ...object.style, lineStyle: event.target.value } }, 'Style changed')}><option>solid</option><option>dashed</option><option>dotted</option></select></label>
      </div>
      {object.objectType === 'label' && <label>Label size<input type="range" min="12" max="54" value={object.style.fontSize || 24} onChange={event => patchObject({ style: { ...object.style, fontSize: number(event.target.value) } }, 'Label size changed')} /></label>}
      {object.objectType === 'plant' && <>
        <label>Plant symbol<select value={object.style.symbol || 'canopy'} onChange={event => patchObject({ style: { ...object.style, symbol: event.target.value } }, 'Plant symbol changed')}>{SYMBOLS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="inspector-grid"><label>Marker quantity<input type="number" min="1" value={object.style.quantity || 1} onChange={event => patchObject({ style: { ...object.style, quantity: Math.max(1, number(event.target.value)) } }, 'Plant quantity changed')} /></label><label>Mature spread (ft)<input type="number" min="0" step=".5" value={object.style.customSpreadFeet || object.style.matureSpreadFeet || ''} onChange={event => patchObject({ style: { ...object.style, customSpreadFeet: Math.max(0, number(event.target.value)) } }, 'Mature spread changed')} /></label></div>
        <label className="check-row"><input type="checkbox" checked={object.style.showMatureSpread} onChange={event => patchObject({ style: { ...object.style, showMatureSpread: event.target.checked } }, 'Mature spread display changed')} /> Show this mature-spread circle</label>
        <label className="check-row"><input type="checkbox" checked={object.style.showLabel !== false} onChange={event => patchObject({ style: { ...object.style, showLabel: event.target.checked } }, 'Plant label display changed')} /> Show plant label</label>
        <p className={`spacing-notice ${notice.toLowerCase().replaceAll(' ', '-')}`}><strong>Spacing guidance:</strong> {notice}. Visual planning aid only.</p>
      </>}
      {object.objectType === 'material' && <><label>Pattern<select value={object.style.pattern || ''} onChange={event => patchObject({ style: { ...object.style, pattern: event.target.value } }, 'Material texture changed')}><option value="">Soft wash</option>{Object.entries(MATERIAL_PATTERNS).map(([name, value]) => <option key={value} value={value}>{name}</option>)}</select></label><label>Client price (optional)<input type="number" min="0" step=".01" value={object.style.clientPrice || ''} onChange={event => patchObject({ style: { ...object.style, clientPrice: event.target.value } }, 'Client price changed')} /></label></>}
      {object.objectType === 'measurement' && <section className="calibration-card"><strong>{measurementLabel(object, settings)}</strong><p>Use this line as an approximate reference. This is not survey or engineering accuracy.</p><button type="button" onClick={() => calibrate(object)}>Calibrate from this line</button></section>}
      <label>Object notes<textarea value={object.notes} onChange={event => patchObject({ notes: event.target.value }, 'Object notes changed')} /></label>
      <div className="privacy-checks">
        <label><input type="checkbox" checked={object.visible} onChange={event => patchObject({ visible: event.target.checked }, 'Visibility changed')} /> Visible</label>
        <label><input type="checkbox" checked={object.locked} onChange={event => patchObject({ locked: event.target.checked }, 'Lock changed')} /> Locked</label>
        <label><input type="checkbox" checked={object.clientVisible} onChange={event => patchObject({ clientVisible: event.target.checked }, 'Privacy changed')} /> Client-visible</label>
        <label><input type="checkbox" checked={object.exportEnabled} onChange={event => patchObject({ exportEnabled: event.target.checked }, 'Export setting changed')} /> Export-enabled</label>
      </div>
      <div className="object-inspector-actions">
        <button type="button" onClick={() => moveZ(1)}>Bring forward</button><button type="button" onClick={() => moveZ(-1)}>Send backward</button>
        <button type="button" onClick={duplicateObject}>Duplicate</button><button type="button" className="danger" onClick={deleteObject}>Delete</button>
      </div>
    </div>
  </aside>;
}

function BackgroundControls({ settings, photos, updateSettings }) {
  return <details className="studio-background-controls glass">
    <summary><span>Property image</span><strong>{photos.find(item => (item.photoId || item.id) === settings.backgroundPhotoId)?.caption || photos.find(item => item.id === settings.backgroundPhotoId)?.fileName || 'Choose a background'}</strong></summary>
    <div>
      <label>Active design background<select value={settings.backgroundPhotoId} onChange={event => updateSettings({ backgroundPhotoId: event.target.value }, 'Background changed')}><option value="">Cream drafting paper</option>{photos.map(photo => <option key={photo.photoId || photo.id} value={photo.photoId || photo.id}>{photo.caption || photo.fileName}</option>)}</select></label>
      <label>Fit<select value={settings.backgroundFit} onChange={event => updateSettings({ backgroundFit: event.target.value }, 'Background fit changed')}><option value="cover">Fill canvas</option><option value="contain">Fit entire image</option></select></label>
      <label>Image opacity<input type="range" min="0" max="1" step=".05" value={settings.backgroundOpacity} onChange={event => updateSettings({ backgroundOpacity: number(event.target.value) }, 'Background opacity changed')} /></label>
      <label>Image zoom<input type="range" min=".5" max="2.5" step=".05" value={settings.backgroundZoom} onChange={event => updateSettings({ backgroundZoom: number(event.target.value) }, 'Background zoom changed')} /></label>
      <label>Rotate<input type="range" min="-180" max="180" step="1" value={settings.backgroundRotation} onChange={event => updateSettings({ backgroundRotation: number(event.target.value) }, 'Background rotated')} /></label>
      <label className="check-row"><input type="checkbox" checked={settings.backgroundVisible} onChange={event => updateSettings({ backgroundVisible: event.target.checked }, 'Background visibility changed')} /> Show image</label>
      <div><button type="button" onClick={() => updateSettings({ backgroundZoom: 1, backgroundPanX: 0, backgroundPanY: 0, backgroundRotation: 0 }, 'Background position reset')}>Reset image position</button><button type="button" onClick={() => updateSettings({ viewportZoom: 1, viewportPanX: 0, viewportPanY: 0 }, 'Canvas centered')}>Center canvas</button></div>
      <small>The original project photo is preserved. These settings apply only to this design canvas.</small>
    </div>
  </details>;
}

function QuickAddControls({ tool, draft, data, project, quick, setQuick }) {
  const plants = [
    ...data.projectPlants.filter(item => item.projectId === project.projectId && active(item)).map(item => ({ id: item.projectPlantId, kind: 'projectPlant', label: item.plantName, item })),
    ...data.designPlants.filter(active).map(item => ({ id: item.plantId, kind: 'palette', label: item.commonName, item })),
    ...data.sourcingRecords.filter(item => item.projectId === project.projectId && active(item)).map(item => ({ id: item.sourcingRecordId, kind: 'sourcing', label: item.plant, item })),
  ];
  const materials = data.designMaterials.filter(active);
  if (!['text', 'plant', 'material', 'overlay', 'feature', 'measurement'].includes(tool)) return null;
  return <section className="quick-add-controls glass" aria-label={`${tool} options`}>
    {tool === 'text' && <label>Label text<input value={quick.label} onChange={event => setQuick({ ...quick, label: event.target.value })} placeholder="Garden label" /></label>}
    {tool === 'measurement' && <label>Measurement label<select value={quick.measurementLabel} onChange={event => setQuick({ ...quick, measurementLabel: event.target.value })}>{['Bed length', 'Bed width', 'Path width', 'Container diameter', 'Tree spacing', 'Plant spacing', 'Structure distance', 'Property feature distance', 'Custom measurement'].map(item => <option key={item}>{item}</option>)}</select></label>}
    {tool === 'plant' && <>
      <label>Plant source<select value={quick.plantSource} onChange={event => setQuick({ ...quick, plantSource: event.target.value })}><option value="">Manual visual placeholder</option>{plants.map(item => <option key={`${item.kind}-${item.id}`} value={`${item.kind}|${item.id}`}>{item.label} · {item.kind === 'projectPlant' ? 'Plant Plan' : item.kind === 'palette' ? 'Design Palette' : 'Sourcing'}</option>)}</select></label>
      <label>Placeholder name<input value={quick.plantLabel} onChange={event => setQuick({ ...quick, plantLabel: event.target.value })} placeholder="Plant name" /></label>
      <label>Symbol<select value={quick.symbol} onChange={event => setQuick({ ...quick, symbol: event.target.value })}>{SYMBOLS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </>}
    {tool === 'material' && <>
      <label>Material<select value={quick.materialId} onChange={event => setQuick({ ...quick, materialId: event.target.value })}><option value="">Manual concept-only placeholder</option>{materials.map(item => <option key={item.materialId} value={item.materialId}>{item.name}</option>)}</select></label>
      <label>Type<select value={quick.materialType} onChange={event => setQuick({ ...quick, materialType: event.target.value })}>{MATERIAL_TYPES.map(item => <option key={item}>{item}</option>)}</select></label>
    </>}
    {tool === 'overlay' && <>
      <label>Overlay group<select value={quick.overlayGroup} onChange={event => setQuick({ ...quick, overlayGroup: event.target.value, overlayLabel: event.target.value === 'Sun and Shade' ? SUN_OPTIONS[0] : SITE_OPTIONS[0] })}><option>Sun and Shade</option><option>Site Conditions</option></select></label>
      <label>Overlay label<select value={quick.overlayLabel} onChange={event => setQuick({ ...quick, overlayLabel: event.target.value })}>{(quick.overlayGroup === 'Sun and Shade' ? SUN_OPTIONS : SITE_OPTIONS).map(item => <option key={item}>{item}</option>)}</select></label>
    </>}
    {tool === 'feature' && <label>Existing feature<select value={quick.featureLabel} onChange={event => setQuick({ ...quick, featureLabel: event.target.value })}>{FEATURE_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>}
    <small>Tap the canvas to place a marker or drag to draw an area.</small>
  </section>;
}

function MiniVersionScene({ version, photos }) {
  const snapshot = version?.snapshot;
  if (!snapshot) return <div className="mini-version-empty">Choose a saved version</div>;
  return <div className="mini-version-scene"><DesignScene objects={snapshot.objects} layers={snapshot.layers} settings={snapshot.canvasSettings} photos={photos} compact clientSafe={false} /></div>;
}

function VersionPanel({ data, setData, project, concept, draft, versions, restoreVersion, openPresentation, independent = false }) {
  const [name, setName] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const saveVersion = () => {
    if (!name.trim()) return;
    const record = createDesignVersion({
      projectId: project.projectId,
      clientId: project.clientId,
      conceptId: concept.designId,
      name: name.trim(),
      revisionNotes: revisionNotes.trim(),
      objects: draft.objects,
      layers: draft.layers,
      canvasSettings: draft.settings,
    });
    setData(current => ({ ...current, designVersions: [record, ...current.designVersions] }));
    setName('');
    setRevisionNotes('');
  };
  const duplicate = version => {
    const record = createDesignVersion({
      projectId: version.projectId,
      clientId: version.clientId,
      conceptId: version.conceptId,
      parentVersionId: version.versionId,
      name: `${version.name} — Revision`,
      revisionNotes: `Duplicated from ${version.name}`,
      ...version.snapshot,
    });
    setData(current => ({ ...current, designVersions: [record, ...current.designVersions] }));
  };
  const rename = version => {
    const value = prompt('Rename this design version:', version.name);
    if (!value?.trim() || value.trim() === version.name) return;
    setData(current => ({ ...current, designVersions: current.designVersions.map(item => item.versionId === version.versionId ? { ...item, name: value.trim(), updatedAt: now() } : item) }));
  };
  const setStatus = (version, status) => {
    if (status === 'Approved' && !confirm(`Approve ${version.name}? This records an explicit design approval but will not approve an estimate or purchase plants.`)) return;
    setData(current => {
      let next = {
        ...current,
        designVersions: current.designVersions.map(item => item.versionId === version.versionId ? {
          ...item,
          status,
          recommended: status === 'Recommended',
          clientSelected: status === 'Client Selected' || status === 'Approved',
          approvedAt: status === 'Approved' ? now() : item.approvedAt,
          archived: status === 'Archived',
          updatedAt: now(),
        } : item),
      };
      if (!independent && ['Recommended', 'Client Selected', 'Approved'].includes(status)) {
        next.designConcepts = next.designConcepts.map(item => item.designId === concept.designId ? {
          ...item,
          status: status === 'Approved' ? 'Approved' : item.status,
          recommended: status === 'Recommended' || item.recommended,
          clientSelected: ['Client Selected', 'Approved'].includes(status) || item.clientSelected,
          clientVisible: true,
          presentationVisible: true,
          updatedAt: now(),
        } : item);
        next.presentationSettings = next.presentationSettings.map(item => item.projectId === project.projectId ? { ...item, selectedDesignVersionId: version.versionId, updatedAt: now() } : item);
      }
      if (!independent && status === 'Approved') {
        const approvalId = uid('approval');
        next.approvalRecords = [{
          id: approvalId,
          approvalId,
          projectId: project.projectId,
          clientId: project.clientId,
          conceptId: concept.designId,
          designVersionId: version.versionId,
          presentationId: `presentation-${project.projectId}`,
          status: 'Approved',
          decisionDate: now().slice(0, 10),
          comments: version.revisionNotes || `Approved design version: ${version.name}`,
          clientVisible: true,
          archived: false,
        }, ...next.approvalRecords];
        next = addTimelineEvent(next, {
          projectId: project.projectId,
          eventType: 'design.version.approved',
          title: 'Design version approved',
          description: version.name,
          relatedRecordId: version.versionId,
          dedupeKey: `design.version.approved:${version.versionId}`,
          automatic: true,
        });
      }
      return next;
    });
  };
  return <section className="studio-management-panel version-panel">
    <div className="management-intro"><div><span>Version history</span><h3>Preserve every design direction</h3><p>Each version stores an independent snapshot of objects, layers, image settings, scale, display choices, and revision notes. Linked Plant Plan and finance records remain references.</p></div></div>
    <div className="version-create-card">
      <label>Version name<input value={name} onChange={event => setName(event.target.value)} placeholder="Concept A, Budget Revision, Final Approved Design…" /></label>
      <label>Revision notes<textarea value={revisionNotes} onChange={event => setRevisionNotes(event.target.value)} placeholder="What changed and why?" /></label>
      <button type="button" className="primary" onClick={saveVersion} disabled={!name.trim()}>Save named version</button>
    </div>
    <div className="version-list">{versions.map(version => <article key={version.versionId}>
      <MiniVersionScene version={version} photos={data.projectPhotos.filter(item => item.projectId === project.projectId && active(item))} />
      <div><span>{version.status}</span><h4>{version.name}</h4><p>{version.revisionNotes || 'No revision note'}</p><small>{dateLabel(version.createdAt)}</small></div>
      <label>Status<select value={version.status} onChange={event => setStatus(version, event.target.value)}>{DESIGN_STATUS_OPTIONS.map(item => <option key={item}>{item}</option>)}</select></label>
      <div className="version-actions"><button type="button" onClick={() => restoreVersion(version)}>Restore to workspace</button><button type="button" onClick={() => rename(version)}>Rename</button><button type="button" onClick={() => duplicate(version)}>Duplicate as revision</button>{!independent && ['Recommended', 'Client Selected', 'Approved'].includes(version.status) && <button type="button" onClick={() => openPresentation?.({ projectId: project.projectId, mode: 'preview' })}>Presentation preview</button>}</div>
    </article>)}{!versions.length && <div className="management-empty">No versions saved yet. The live canvas remains auto-saved, and named versions create durable comparison points.</div>}</div>
  </section>;
}

function ComparePanel({ versions, photos }) {
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [single, setSingle] = useState('');
  useEffect(() => {
    if (!leftId && versions[1]) setLeftId(versions[1].versionId);
    if (!rightId && versions[0]) setRightId(versions[0].versionId);
  }, [versions, leftId, rightId]);
  const left = versions.find(item => item.versionId === leftId);
  const right = versions.find(item => item.versionId === rightId);
  const diff = compareDesignVersions(left, right);
  return <section className="studio-management-panel compare-panel">
    <div className="management-intro"><div><span>Record comparison</span><h3>Compare two versions</h3><p>Differences are calculated from connected objects and records, not pixel analysis.</p></div><button type="button" onClick={() => setSingle(single ? '' : 'left')}>{single ? 'Side by side' : 'Toggle view'}</button></div>
    <div className="compare-selectors"><label>Earlier version<select value={leftId} onChange={event => setLeftId(event.target.value)}><option value="">Choose</option>{versions.map(item => <option key={item.versionId} value={item.versionId}>{item.name}</option>)}</select></label><label>Later version<select value={rightId} onChange={event => setRightId(event.target.value)}><option value="">Choose</option>{versions.map(item => <option key={item.versionId} value={item.versionId}>{item.name}</option>)}</select></label>{single && <button type="button" onClick={() => setSingle(single === 'left' ? 'right' : 'left')}>Show {single === 'left' ? right?.name : left?.name}</button>}</div>
    <div className={`comparison-canvases ${single ? 'single' : ''}`}>{(!single || single === 'left') && <article><h4>{left?.name || 'Earlier version'}</h4><MiniVersionScene version={left} photos={photos} /></article>}{(!single || single === 'right') && <article><h4>{right?.name || 'Later version'}</h4><MiniVersionScene version={right} photos={photos} /></article>}</div>
    {left && right && <div className="difference-summary">
      <article><span>Placed plants</span><strong>{diff.leftPlants} → {diff.rightPlants}</strong></article>
      <article><span>Material areas</span><strong>{diff.leftMaterials} → {diff.rightMaterials}</strong></article>
      <article><span>Client-price signal</span><strong>{money(diff.leftClientPrice)} → {money(diff.rightClientPrice)}</strong></article>
      <section><h4>Added</h4>{diff.added.map(item => <p key={item.key}>+ {item.count} {item.label}</p>)}{!diff.added.length && <p>Nothing added</p>}</section>
      <section><h4>Removed</h4>{diff.removed.map(item => <p key={item.key}>− {item.count} {item.label}</p>)}{!diff.removed.length && <p>Nothing removed</p>}</section>
      <section><h4>Revision notes</h4><p><strong>{left.name}:</strong> {left.revisionNotes || 'None'}</p><p><strong>{right.name}:</strong> {right.revisionNotes || 'None'}</p></section>
    </div>}
  </section>;
}

function SyncPanel({ data, setData, project, concept, objects, patchLocalObject }) {
  const plants = objects.filter(item => item.objectType === 'plant' && active(item));
  const projectPlants = data.projectPlants.filter(item => item.projectId === project.projectId && active(item));
  const placedByPlan = new Map();
  plants.forEach(item => {
    if (!item.relatedProjectPlantId) return;
    placedByPlan.set(item.relatedProjectPlantId, (placedByPlan.get(item.relatedProjectPlantId) || 0) + number(item.style?.quantity || 1));
  });
  const addToPlan = object => {
    const record = createProjectPlantRecord({
      projectId: project.projectId,
      clientId: project.clientId,
      conceptId: concept.designId,
      designPlantId: object.objectId,
      sourcingRecordId: object.relatedSourcingRecordId,
      plantName: object.label || 'Design plant',
      scientificName: object.style?.scientificName || '',
      cultivar: object.style?.cultivar || '',
      quantity: object.style?.quantity || 1,
      installationLocation: object.style?.installationArea || '',
      clientPrice: object.style?.clientPrice || '',
      status: 'Proposed',
    });
    setData(current => addTimelineEvent({ ...current, projectPlants: [record, ...current.projectPlants] }, {
      projectId: project.projectId,
      eventType: 'plant.added.from.design',
      title: 'Design plant added to Project Plant Plan',
      description: record.plantName,
      relatedRecordId: record.projectPlantId,
      dedupeKey: `plant.added.from.design:${record.projectPlantId}`,
      automatic: true,
    }));
    patchLocalObject(object.objectId, { relatedProjectPlantId: record.projectPlantId, sourceKind: 'projectPlant' }, 'Plant linked to Project Plant Plan');
  };
  const link = (object, projectPlantId) => patchLocalObject(object.objectId, { relatedProjectPlantId: projectPlantId, sourceKind: 'projectPlant' }, 'Existing Plant Plan item linked');
  const updateQuantity = object => {
    const qty = number(object.style?.quantity || 1);
    setData(current => ({ ...current, projectPlants: current.projectPlants.map(item => item.projectPlantId === object.relatedProjectPlantId ? { ...item, quantity: qty, updatedAt: now() } : item) }));
  };
  const archivePlan = plan => {
    if (!confirm(`Archive ${plan.plantName} from the Project Plant Plan? Canvas markers will remain and become unlinked.`)) return;
    setData(current => ({ ...current, projectPlants: current.projectPlants.map(item => item.projectPlantId === plan.projectPlantId ? { ...item, archived: true, status: 'Archived', updatedAt: now() } : item) }));
    plants.filter(item => item.relatedProjectPlantId === plan.projectPlantId).forEach(item => patchLocalObject(item.objectId, { relatedProjectPlantId: '', sourceKind: 'manual' }, 'Archived Plant Plan link removed'));
  };
  return <section className="studio-management-panel sync-panel">
    <div className="management-intro"><div><span>Controlled synchronization</span><h3>Design ↔ Project Plant Plan</h3><p>Review every difference. Nothing is silently added, updated, archived, or deleted.</p></div></div>
    <div className="sync-grid">
      <section><h4>Design plants</h4>{plants.map(object => {
        const plan = projectPlants.find(item => item.projectPlantId === object.relatedProjectPlantId);
        const difference = plan && number(plan.quantity) !== number(object.style?.quantity || 1);
        return <article key={object.objectId}><div><strong>{object.label || 'Plant placeholder'}</strong><span>{plan ? `Linked to ${plan.projectPlantId}` : object.style?.syncDisposition === 'design-only' ? 'Kept design-only' : 'Unlinked design marker'}</span>{difference && <small>Quantity differs: design {object.style?.quantity || 1} · plan {plan.quantity || 1}</small>}</div>{plan ? <><button type="button" onClick={() => updateQuantity(object)} disabled={!difference}>Update plan quantity</button><button type="button" onClick={() => link(object, '')}>Unlink</button></> : <><button type="button" onClick={() => addToPlan(object)}>Add to Plant Plan</button><label>Link existing<select value="" onChange={event => link(object, event.target.value)}><option value="">Choose item</option>{projectPlants.map(item => <option key={item.projectPlantId} value={item.projectPlantId}>{item.plantName}</option>)}</select></label><button type="button" onClick={() => patchLocalObject(object.objectId, { style: { ...object.style, syncDisposition: 'design-only' } }, 'Plant kept design-only')}>Keep design-only</button><button type="button" onClick={() => patchLocalObject(object.objectId, { style: { ...object.style, syncDisposition: 'ignored' } }, 'Plant difference ignored')}>Ignore</button></>}</article>;
      })}{!plants.length && <div className="management-empty">No plant markers are placed.</div>}</section>
      <section><h4>Plant Plan items not placed</h4>{projectPlants.filter(item => !placedByPlan.has(item.projectPlantId)).map(plan => <article key={plan.projectPlantId}><div><strong>{plan.plantName}</strong><span>{plan.status} · quantity {plan.quantity || 1}</span>{plan.sourcingRecordId && <small>Sourcing linked</small>}</div><button type="button" onClick={() => archivePlan(plan)}>Archive from Plant Plan</button></article>)}{projectPlants.length > 0 && !projectPlants.some(item => !placedByPlan.has(item.projectPlantId)) && <div className="management-empty">Every active Plant Plan item has a canvas marker.</div>}{!projectPlants.length && <div className="management-empty">The Project Plant Plan is empty.</div>}</section>
    </div>
  </section>;
}

function EstimateReviewPanel({ data, setData, project, objects, patchLocalObject }) {
  const [estimateId, setEstimateId] = useState('');
  const designItems = objects.filter(item => active(item) && ['plant', 'material'].includes(item.objectType));
  const estimates = data.estimates.filter(item => item.projectId === project.projectId && active(item));
  const target = estimates.find(item => (item.estimateId || item.id) === estimateId);
  const locked = target && ['Approved', 'Deposit Paid', 'Paid'].includes(target.status);
  const linesFor = item => ({
    id: uid('line'),
    lineId: uid('estimate-line'),
    description: item.label || (item.objectType === 'plant' ? 'Design plant' : 'Design material'),
    category: item.objectType === 'plant' ? 'Plants' : 'Materials',
    qty: number(item.style?.quantity || 1),
    price: number(item.style?.clientPrice || 0),
    relatedDesignObjectId: item.objectId,
    projectPlantId: item.relatedProjectPlantId || '',
    materialId: item.relatedMaterialId || '',
  });
  const addLine = item => {
    if (!target || locked) return;
    if (!confirm(`Add ${item.label || 'this design item'} to ${target.title}?`)) return;
    const line = linesFor(item);
    setData(current => ({ ...current, estimates: current.estimates.map(document => {
      if ((document.estimateId || document.id) !== estimateId) return document;
      if (records(document.lines).some(existing => existing.relatedDesignObjectId === item.objectId)) return document;
      const lines = [...records(document.lines), line];
      const subtotal = lines.reduce((sum, record) => sum + number(record.qty) * number(record.price), 0);
      const tax = subtotal * number(document.tax || 0) / 100;
      return { ...document, lines, subtotal, total: subtotal + tax, updatedAt: now() };
    }) }));
    patchLocalObject(item.objectId, { relatedEstimateId: estimateId, relatedEstimateLineId: line.lineId, style: { ...item.style, estimateDisposition: 'added' } }, 'Design item linked to estimate');
  };
  const updateLine = item => {
    if (!target || locked) return;
    if (!confirm(`Update the existing estimate line from ${item.label || 'this design item'}?`)) return;
    setData(current => ({ ...current, estimates: current.estimates.map(document => {
      if ((document.estimateId || document.id) !== estimateId) return document;
      const lines = records(document.lines).map(line => line.relatedDesignObjectId === item.objectId ? { ...line, ...linesFor(item), id: line.id, lineId: line.lineId || line.id } : line);
      const subtotal = lines.reduce((sum, record) => sum + number(record.qty) * number(record.price), 0);
      return { ...document, lines, subtotal, total: subtotal + subtotal * number(document.tax || 0) / 100, updatedAt: now() };
    }) }));
  };
  const createDraft = () => {
    const included = designItems.filter(item => item.style?.estimateDisposition !== 'excluded');
    if (!included.length || !confirm(`Create a draft estimate with ${included.length} design item${included.length === 1 ? '' : 's'}?`)) return;
    const id = uid('estimate');
    const lines = included.map(linesFor);
    const subtotal = lines.reduce((sum, line) => sum + number(line.qty) * number(line.price), 0);
    const client = data.clients.find(item => (item.clientId || item.id) === project.clientId);
    const document = {
      id,
      estimateId: id,
      documentType: 'Estimate',
      title: `${project.name} Design Review`,
      client: client?.name || '',
      clientId: project.clientId,
      projectId: project.projectId,
      status: 'Draft',
      date: now().slice(0, 10),
      dueDate: '',
      lines,
      subtotal,
      tax: 0,
      total: subtotal,
      notes: 'Created by explicit action from the Phase 6 design-to-estimate review.',
      clientVisible: false,
      presentationVisible: false,
      showPrice: false,
      archived: false,
    };
    setData(current => ({ ...current, estimates: [document, ...current.estimates] }));
    setEstimateId(id);
  };
  return <section className="studio-management-panel estimate-review-panel">
    <div className="management-intro"><div><span>Financial guardrail</span><h3>Design-to-estimate review</h3><p>Review client-facing items before creating or changing a draft. Approved estimates are read-only here.</p></div><button type="button" className="primary" onClick={createDraft}>Create draft estimate</button></div>
    <label className="estimate-target">Existing estimate<select value={estimateId} onChange={event => setEstimateId(event.target.value)}><option value="">Choose an estimate</option>{estimates.map(item => <option key={item.estimateId || item.id} value={item.estimateId || item.id}>{item.title} · {item.status}</option>)}</select></label>
    {locked && <div className="privacy-warning" role="status">This estimate is {target.status}. It is protected from design changes.</div>}
    <div className="estimate-review-list">{designItems.map(item => {
      const line = records(target?.lines).find(record => record.relatedDesignObjectId === item.objectId);
      return <article key={item.objectId}><div><span>{item.objectType}</span><strong>{item.label || 'Unnamed design item'}</strong><small>Qty {item.style?.quantity || 1} · {money(item.style?.clientPrice || 0)} client price · {line ? 'Already on estimate' : item.style?.estimateDisposition || 'Review needed'}</small></div><button type="button" disabled={!target || locked || Boolean(line)} onClick={() => addLine(item)}>Add to estimate</button><button type="button" disabled={!target || locked || !line} onClick={() => updateLine(item)}>Update line</button><button type="button" onClick={() => patchLocalObject(item.objectId, { style: { ...item.style, estimateDisposition: 'design-only' } }, 'Item kept design-only')}>Keep design-only</button><button type="button" onClick={() => patchLocalObject(item.objectId, { style: { ...item.style, estimateDisposition: 'excluded' } }, 'Item excluded from estimate')}>Exclude</button></article>;
    })}{!designItems.length && <div className="management-empty">Place plants or materials to begin the estimate review.</div>}</div>
  </section>;
}

function NotesPanel({ data, setData, project, concept, versions, selectedObject }) {
  const [form, setForm] = useState({ category: 'Revision', text: '', versionId: '', clientVisible: false, authorLabel: 'Tierra Fleur Designs' });
  const notes = data.designNotes.filter(item => item.conceptId === concept.designId && active(item));
  const add = event => {
    event.preventDefault();
    if (!form.text.trim()) return;
    const noteId = uid('design-note');
    setData(current => ({ ...current, designNotes: [{
      ...form,
      id: noteId,
      noteId,
      projectId: project.projectId,
      clientId: project.clientId,
      conceptId: concept.designId,
      relatedObjectId: selectedObject?.objectId || '',
      relatedProjectPlantId: selectedObject?.relatedProjectPlantId || '',
      relatedMaterialId: selectedObject?.relatedMaterialId || '',
      text: form.text.trim(),
      resolved: false,
      createdAt: now(),
      updatedAt: now(),
      archived: false,
    }, ...current.designNotes] }));
    setForm({ ...form, text: '', clientVisible: false });
  };
  return <section className="studio-management-panel notes-panel">
    <div className="management-intro"><div><span>Design notebook</span><h3>Concept and version notes</h3><p>Notes are internal by default and may be tied to the selected canvas object.</p></div></div>
    <form onSubmit={add}>
      <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{NOTE_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Version<select value={form.versionId} onChange={event => setForm({ ...form, versionId: event.target.value })}><option value="">Concept-wide</option>{versions.map(item => <option key={item.versionId} value={item.versionId}>{item.name}</option>)}</select></label>
      <label>Author label<input value={form.authorLabel} onChange={event => setForm({ ...form, authorLabel: event.target.value })} /></label>
      <label>Note<textarea required value={form.text} onChange={event => setForm({ ...form, text: event.target.value })} placeholder="Client request, site condition, revision decision…" /></label>
      <label className="check-row"><input type="checkbox" checked={form.clientVisible} onChange={event => setForm({ ...form, clientVisible: event.target.checked })} /> Client-visible</label>
      <button className="primary">Save design note</button>
    </form>
    <div className="design-note-list">{notes.map(note => <article key={note.noteId} className={note.clientVisible ? 'client-visible' : 'private'}><div><span>{note.category} · {note.clientVisible ? 'Client-visible' : 'Internal'}</span><strong>{note.authorLabel}</strong><p>{note.text}</p><small>{dateLabel(note.createdAt)}{note.relatedObjectId ? ' · Linked to canvas object' : ''}</small></div><label><input type="checkbox" checked={note.resolved} onChange={event => setData(current => ({ ...current, designNotes: current.designNotes.map(item => item.noteId === note.noteId ? { ...item, resolved: event.target.checked, updatedAt: now() } : item) }))} /> Resolved</label><button type="button" onClick={() => setData(current => ({ ...current, designNotes: current.designNotes.map(item => item.noteId === note.noteId ? { ...item, archived: true } : item) }))}>Archive</button></article>)}{!notes.length && <div className="management-empty">No notes for this concept yet.</div>}</div>
  </section>;
}

function LegendsAndCosts({ data, setData, project, concept, objects }) {
  const plants = objects.filter(item => item.objectType === 'plant' && active(item) && item.visible !== false);
  const materials = objects.filter(item => item.objectType === 'material' && active(item) && item.visible !== false);
  const costs = designCostSummary(data, project.projectId, objects);
  const stored = data.designLegendSettings.find(item => item.conceptId === concept.designId) || { groupPlantsBy: 'Area', groupMaterialsBy: 'Type', showScientificNames: true, showQuantities: true };
  const saveLegendSetting = changes => {
    const next = { ...stored, ...changes, id: stored.id || `design-legend-${concept.designId}`, legendSettingId: stored.legendSettingId || `design-legend-${concept.designId}`, projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId, updatedAt: now(), archived: false };
    setData(current => ({ ...current, designLegendSettings: [next, ...current.designLegendSettings.filter(item => item.conceptId !== concept.designId)] }));
  };
  const byPlant = new Map();
  plants.forEach(item => {
    const key = item.relatedProjectPlantId || `${item.label}|${item.style?.cultivar || ''}`;
    const current = byPlant.get(key) || { ...item, count: 0 };
    current.count += number(item.style?.quantity || 1);
    byPlant.set(key, current);
  });
  return <section className="studio-management-panel legends-costs-panel">
    <div className="management-intro"><div><span>Connected summaries</span><h3>Legends and client-facing investment</h3><p>Purchase cost, markup, margin, nursery negotiations, and internal labor calculations are never shown here.</p></div><div className="legend-controls"><label>Group plants by<select value={stored.groupPlantsBy} onChange={event => saveLegendSetting({ groupPlantsBy: event.target.value })}>{['Area', 'Plant category', 'Concept', 'Edible versus ornamental', 'Proposed versus approved'].map(item => <option key={item}>{item}</option>)}</select></label><label>Group materials by<select value={stored.groupMaterialsBy} onChange={event => saveLegendSetting({ groupMaterialsBy: event.target.value })}><option>Type</option><option>Installation purpose</option><option>Client visibility</option></select></label></div></div>
    <div className="legend-cost-grid">
      <section><h4>Plant legend</h4>{[...byPlant.values()].map(item => {
        const plan = data.projectPlants.find(record => record.projectPlantId === item.relatedProjectPlantId);
        return <article key={item.objectId}><span className="legend-symbol"><SymbolMark symbol={item.style?.symbol} /></span><div><strong>{item.label}</strong><em>{plan?.scientificName || item.style?.scientificName || 'Scientific name not entered'}</em><small>{item.style?.installationArea || plan?.installationLocation || 'Area open'} · quantity {item.count} · {plan?.status || 'Design-only'}</small></div><span>{item.clientVisible ? 'Client' : 'Internal'}</span></article>;
      })}{!plants.length && <div className="management-empty">No placed plants.</div>}</section>
      <section><h4>Material legend</h4>{materials.map(item => <article key={item.objectId}><span className={`material-swatch ${item.style?.pattern || ''}`} /><div><strong>{item.label}</strong><small>{item.style?.finish || item.style?.pattern || 'Soft concept wash'} · quantity {item.style?.quantity || 1}</small></div><span>{item.clientVisible ? 'Client' : 'Internal'}</span></article>)}{!materials.length && <div className="management-empty">No placed materials.</div>}</section>
      <section className="client-cost-summary"><h4>Client-facing cost summary</h4>{[['Plants', costs.plants], ['Materials', costs.materials], ['Installation', costs.installation], ['Delivery', costs.delivery], ['Design services', costs.designServices], ['Optional add-ons', costs.addOns]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}<div className="total"><span>Total client-facing investment</span><strong>{money(costs.total)}</strong></div><small>Connected records only. Design-only placeholders with no client price remain $0.</small></section>
    </div>
  </section>;
}

function ExportPanel({ data, setData, project, concept, objects, layers, settings, photos, sceneRef }) {
  const savedOptions = data.designExportSettings.find(item => item.conceptId === concept.designId);
  const [options, setOptions] = useState({ includeLegends: true, includeMeasurements: true, includeBranding: true, includeTitle: true, clientSafe: true, ...(savedOptions || {}) });
  const [preparedExport, setPreparedExport] = useState(null);
  const [exportState, setExportState] = useState('');
  useEffect(() => () => {
    if (preparedExport?.url) URL.revokeObjectURL(preparedExport.url);
  }, [preparedExport?.url]);
  const saveOptions = next => {
    setOptions(next);
    const record = { ...next, id: savedOptions?.id || `design-export-${concept.designId}`, exportSettingId: savedOptions?.exportSettingId || `design-export-${concept.designId}`, projectId: project.projectId, clientId: project.clientId, conceptId: concept.designId, updatedAt: now(), archived: false };
    setData(current => ({ ...current, designExportSettings: [record, ...current.designExportSettings.filter(item => item.conceptId !== concept.designId)] }));
  };
  const exportImage = async () => {
    const source = sceneRef.current;
    if (!source) {
      setExportState('The active canvas is unavailable. Reopen the concept and try again.');
      return;
    }
    setExportState('Preparing flattened PNG…');
    try {
      const svg = source.cloneNode(true);
      svg.setAttribute('viewBox', `0 0 ${DESIGN_CANVAS_WIDTH} ${DESIGN_CANVAS_HEIGHT + (options.includeLegends ? 130 : 0)}`);
      svg.setAttribute('width', String(DESIGN_CANVAS_WIDTH));
      svg.setAttribute('height', String(DESIGN_CANVAS_HEIGHT + (options.includeLegends ? 130 : 0)));
      if (options.clientSafe) {
        svg.querySelectorAll('[data-client-visible="false"], [data-export-enabled="false"]').forEach(node => node.remove());
      } else {
        svg.querySelectorAll('[data-export-enabled="false"]').forEach(node => node.remove());
      }
      svg.querySelectorAll('.design-selection-outline, .design-resize-handle').forEach(node => node.remove());
      if (!options.includeMeasurements) svg.querySelectorAll('.scene-measurement-text').forEach(node => node.parentElement?.remove());
      const ns = 'http://www.w3.org/2000/svg';
      if (options.includeLegends) {
        const band = document.createElementNS(ns, 'rect');
        band.setAttribute('x', '0'); band.setAttribute('y', String(DESIGN_CANVAS_HEIGHT)); band.setAttribute('width', String(DESIGN_CANVAS_WIDTH)); band.setAttribute('height', '130'); band.setAttribute('fill', '#fff8ec');
        svg.appendChild(band);
        const legend = document.createElementNS(ns, 'text');
        legend.setAttribute('x', '40'); legend.setAttribute('y', String(DESIGN_CANVAS_HEIGHT + 45)); legend.setAttribute('fill', DESIGN_COLORS.deepGreen); legend.setAttribute('font-size', '24'); legend.setAttribute('font-family', 'Georgia, serif');
        const labels = [...new Set(objects.filter(item => active(item) && item.visible !== false && (!options.clientSafe || item.clientVisible)).map(item => item.label).filter(Boolean))].slice(0, 10);
        legend.textContent = labels.length ? `Legend · ${labels.join('  •  ')}` : 'Legend · No visible labeled objects';
        svg.appendChild(legend);
      }
      if (options.includeTitle || options.includeBranding) {
        const title = document.createElementNS(ns, 'text');
        title.setAttribute('x', '40'); title.setAttribute('y', '52'); title.setAttribute('fill', DESIGN_COLORS.deepGreen); title.setAttribute('font-size', '28'); title.setAttribute('font-family', 'Georgia, serif'); title.setAttribute('paint-order', 'stroke'); title.setAttribute('stroke', '#fff8ec'); title.setAttribute('stroke-width', '8');
        title.textContent = `${options.includeBranding ? 'Tierra Fleur Designs · ' : ''}${options.includeTitle ? `${project.name} · ${concept.name}` : ''}`;
        svg.appendChild(title);
      }
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('The design scene could not be rendered.'));
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = DESIGN_CANVAS_WIDTH * 2;
      canvas.height = (DESIGN_CANVAS_HEIGHT + (options.includeLegends ? 130 : 0)) * 2;
      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('The design image could not be encoded.')), 'image/png');
      });
      const name = `${project.name}-${concept.name}-${options.clientSafe ? 'client-safe' : 'internal'}.png`.replace(/[^a-z0-9.-]+/gi, '-');
      const downloadUrl = URL.createObjectURL(pngBlob);
      setPreparedExport({ url: downloadUrl, name });
      setExportState('PNG ready. The direct link remains available if the automatic download is blocked.');
      const anchor = document.createElement('a');
      anchor.download = name;
      anchor.href = downloadUrl;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      setExportState(error instanceof Error ? error.message : 'The design image could not be prepared.');
    }
  };
  const printSheet = () => {
    document.body.classList.add('printing-design-sheet');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-design-sheet'), 500);
    }, 50);
  };
  return <section className="studio-management-panel export-panel">
    <div className="management-intro"><div><span>Share with intention</span><h3>Export and print</h3><p>Only visible, export-enabled layers are included. Client-safe exports also remove internal layers and private objects.</p></div></div>
    <div className="export-options">{Object.entries({
      includeLegends: 'Include legends',
      includeMeasurements: 'Include measurements',
      includeBranding: 'Include Tierra Fleur branding',
      includeTitle: 'Include project and version title',
      clientSafe: 'Client-safe export',
    }).map(([key, label]) => <label key={key}><input type="checkbox" checked={options[key]} onChange={event => saveOptions({ ...options, [key]: event.target.checked })} /> {label}</label>)}</div>
    <div className="export-actions"><button type="button" className="primary" onClick={exportImage}>Download flattened PNG</button>{preparedExport && <a className="button-link" href={preparedExport.url} download={preparedExport.name}>Download prepared PNG</a>}<button type="button" onClick={printSheet}>Open printable design sheet</button></div>
    {exportState && <div className="export-status" role="status">{exportState}</div>}
    <div className="privacy-warning">Client-safe output excludes private notes, internal overlays, purchase costs, markup, profit, margin, nursery notes, and hidden objects.</div>
    <div className="design-print-sheet" aria-hidden="true">
      <header><img src="/assets/tierra-fleur-crest.jpeg" alt="" /><div><span>Tierra Fleur Designs</span><h1>{project.name}</h1><p>{concept.name} · {new Date().toLocaleDateString()}</p></div></header>
      <DesignScene objects={objects} layers={layers} settings={settings} photos={photos} clientSafe compact />
      <section><h2>Plant legend</h2>{objects.filter(item => item.objectType === 'plant' && item.clientVisible && active(item)).map(item => <p key={item.objectId}>{item.label} · quantity {item.style?.quantity || 1}</p>)}</section>
      <section><h2>Material legend</h2>{objects.filter(item => item.objectType === 'material' && item.clientVisible && active(item)).map(item => <p key={item.objectId}>{item.label} · {item.style?.finish || item.style?.pattern || 'Selected finish'}</p>)}</section>
    </div>
  </section>;
}

function TemplatePanel({ templates, applyTemplate }) {
  return <section className="studio-management-panel template-panel">
    <div className="management-intro"><div><span>Reusable starting points</span><h3>Design templates</h3><p>Templates add new objects to this concept. They never overwrite the current design or include fabricated client data.</p></div></div>
    <div className="template-grid">{templates.filter(active).map(template => <article key={template.templateId}><span aria-hidden="true">❦</span><h4>{template.name}</h4><p>{template.description}</p><small>{template.objects.length} starting objects</small><button type="button" onClick={() => applyTemplate(template)}>Add template to design</button></article>)}</div>
  </section>;
}

export function InteractiveDesignStudio({ data, setData, project, concept, duplicateConcept, openPresentation, independent = false }) {
  const conceptId = concept.designId;
  const clientId = project.clientId || '';
  const initialDraft = useCallback(() => ({
    objects: clone(data.designObjects.filter(item => item.conceptId === conceptId)),
    layers: clone(data.designLayers.filter(item => item.conceptId === conceptId)),
    settings: clone(data.designCanvasSettings.find(item => item.conceptId === conceptId)),
  }), [conceptId]);
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(draft);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [tool, setTool] = useState('select');
  const [tempObject, setTempObject] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState('Saved');
  const [panel, setPanel] = useState('Versions');
  const [consultation, setConsultation] = useState(false);
  const [showConsultationCosts, setShowConsultationCosts] = useState(false);
  const [quick, setQuick] = useState({ label: 'Garden label', measurementLabel: 'Bed length', plantSource: '', plantLabel: '', symbol: 'canopy', materialId: '', materialType: 'Mulch', overlayGroup: 'Sun and Shade', overlayLabel: 'Full Sun', featureLabel: 'House' });
  const sceneRef = useRef(null);
  const interactionRef = useRef(null);
  const baseRevisionRef = useRef(number(draft.settings?.revision));
  const latestPersistedRef = useRef(draft.settings?.updatedAt || '');
  const copyRef = useRef(null);
  const photos = data.projectPhotos.filter(item => item.projectId === project.projectId && active(item));
  const versions = data.designVersions.filter(item => item.conceptId === conceptId && active(item)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const selected = draft.objects.find(item => item.objectId === selectedId && active(item));
  const currentLayer = draft.layers.find(item => item.layerId === selectedLayerId) || draft.layers.find(item => item.name === 'Bed Outlines' && active(item)) || draft.layers.find(active);

  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => {
    const next = initialDraft();
    setDraft(next);
    draftRef.current = next;
    baseRevisionRef.current = number(next.settings?.revision);
    latestPersistedRef.current = next.settings?.updatedAt || '';
    setHistory([]);
    setFuture([]);
    setSelectedId('');
    setDirty(false);
    setSaveState('Saved');
  }, [conceptId]);

  const persist = useCallback((manual = false) => {
    const snapshot = clone(draftRef.current);
    if (!snapshot.settings) return;
    const currentSettings = data.designCanvasSettings.find(item => item.conceptId === conceptId);
    if (!manual && number(currentSettings?.revision) > baseRevisionRef.current && currentSettings?.updatedAt !== latestPersistedRef.current) {
      setSaveState('Newer saved design detected — use Save now to confirm this workspace');
      return;
    }
    const savedAt = now();
    const nextRevision = Math.max(number(currentSettings?.revision), baseRevisionRef.current) + 1;
    const settings = { ...snapshot.settings, updatedAt: savedAt, revision: nextRevision };
    baseRevisionRef.current = nextRevision;
    latestPersistedRef.current = savedAt;
    draftRef.current = { ...snapshot, settings };
    setDraft(currentDraft => ({ ...currentDraft, settings }));
    setData(current => ({
      ...current,
      designObjects: [...current.designObjects.filter(item => item.conceptId !== conceptId), ...snapshot.objects],
      designLayers: [...current.designLayers.filter(item => item.conceptId !== conceptId), ...snapshot.layers],
      designCanvasSettings: [...current.designCanvasSettings.filter(item => item.conceptId !== conceptId), settings],
      designConcepts: current.designConcepts.map(item => item.designId === conceptId ? { ...item, updatedAt: savedAt } : item),
      independentDesigns: (current.independentDesigns || []).map(item => item.designId === conceptId ? { ...item, updatedAt: savedAt } : item),
    }));
    setDirty(false);
    setSaveState(manual ? 'Saved now' : 'Auto-saved');
    setTimeout(() => setSaveState('Saved'), 1600);
  }, [conceptId, data.designCanvasSettings, setData]);

  useEffect(() => {
    if (!dirty) return undefined;
    setSaveState('Saving…');
    const timer = setTimeout(() => persist(false), 700);
    return () => clearTimeout(timer);
  }, [dirty, draft, persist]);

  useEffect(() => {
    const warn = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const pushHistory = useCallback((before, next, reason) => {
    setHistory(items => [...items.slice(-(DESIGN_HISTORY_LIMIT - 1)), { draft: clone(before), reason }]);
    setFuture([]);
    setDraft(next);
    draftRef.current = next;
    setDirty(true);
  }, []);

  const commit = useCallback((updater, reason) => {
    const before = draftRef.current;
    const next = typeof updater === 'function' ? updater(clone(before)) : updater;
    pushHistory(before, next, reason);
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const entry = history[history.length - 1];
    setFuture(items => [{ draft: clone(draftRef.current), reason: entry.reason }, ...items].slice(0, DESIGN_HISTORY_LIMIT));
    setHistory(items => items.slice(0, -1));
    setDraft(entry.draft);
    draftRef.current = entry.draft;
    setSelectedId('');
    setDirty(true);
  }, [history]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const entry = future[0];
    setHistory(items => [...items.slice(-(DESIGN_HISTORY_LIMIT - 1)), { draft: clone(draftRef.current), reason: entry.reason }]);
    setFuture(items => items.slice(1));
    setDraft(entry.draft);
    draftRef.current = entry.draft;
    setSelectedId('');
    setDirty(true);
  }, [future]);

  const updateSettings = (changes, reason) => commit(current => ({ ...current, settings: { ...current.settings, ...changes } }), reason);
  const updateLayers = (layers, reason) => commit(current => ({ ...current, layers }), reason);
  const patchLocalObject = useCallback((objectId, changes, reason) => commit(current => ({
    ...current,
    objects: current.objects.map(item => item.objectId === objectId ? { ...item, ...changes, updatedAt: now() } : item),
  }), reason), [commit]);
  const patchSelected = (changes, reason) => selected && patchLocalObject(selected.objectId, changes, reason);
  const addObject = (object, reason = 'Object added') => {
    commit(current => ({ ...current, objects: [...current.objects, object] }), reason);
    setSelectedId(object.objectId);
    setTool('select');
  };
  const deleteSelected = useCallback(() => {
    const object = draftRef.current.objects.find(item => item.objectId === selectedId);
    if (!object || object.locked) return;
    if (!confirm(`Delete ${object.label || 'the selected object'} from this design? Undo remains available until the workspace is closed.`)) return;
    commit(current => ({ ...current, objects: current.objects.map(item => item.objectId === selectedId ? { ...item, archived: true, updatedAt: now() } : item) }), 'Object deleted');
    setSelectedId('');
  }, [selectedId, commit]);
  const duplicateSelected = useCallback(() => {
    const object = draftRef.current.objects.find(item => item.objectId === selectedId);
    if (!object) return;
    const duplicate = createDesignObject({ ...clone(object), id: undefined, objectId: undefined, x: number(object.x) + 28, y: number(object.y) + 28, zIndex: Math.max(...draftRef.current.objects.map(item => number(item.zIndex)), 0) + 1, createdAt: now(), updatedAt: now(), legacySourceId: '' });
    addObject(duplicate, 'Object duplicated');
  }, [selectedId, commit]);
  const moveZ = direction => {
    if (!selected) return;
    const values = draft.objects.map(item => number(item.zIndex));
    patchSelected({ zIndex: direction > 0 ? Math.max(...values, 0) + 1 : Math.min(...values, 0) - 1 }, 'Object layer order changed');
  };

  const canvasPoint = event => {
    const svg = sceneRef.current;
    const rect = svg.getBoundingClientRect();
    const zoom = number(draftRef.current.settings.viewportZoom) || 1;
    const viewWidth = DESIGN_CANVAS_WIDTH / zoom;
    const viewHeight = DESIGN_CANVAS_HEIGHT / zoom;
    const viewX = -number(draftRef.current.settings.viewportPanX) + (DESIGN_CANVAS_WIDTH - viewWidth) / 2;
    const viewY = -number(draftRef.current.settings.viewportPanY) + (DESIGN_CANVAS_HEIGHT - viewHeight) / 2;
    return { x: viewX + (event.clientX - rect.left) / rect.width * viewWidth, y: viewY + (event.clientY - rect.top) / rect.height * viewHeight };
  };

  const selectedSourcePlant = () => {
    const [kind, id] = quick.plantSource.split('|');
    if (kind === 'projectPlant') return { kind, item: data.projectPlants.find(item => item.projectPlantId === id) };
    if (kind === 'palette') return { kind, item: data.designPlants.find(item => item.plantId === id) };
    if (kind === 'sourcing') return { kind, item: data.sourcingRecords.find(item => item.sourcingRecordId === id) };
    return { kind: 'manual', item: null };
  };

  const newObjectAt = (point, kind = tool) => {
    let layerName = 'Notes';
    let objectType = kind;
    let label = quick.label;
    let width = 170;
    let height = 58;
    let sourceKind = 'manual';
    let links = {};
    let style = { stroke: DESIGN_COLORS.deepGreen, fill: DESIGN_COLORS.cream, fillOpacity: .72, fontSize: 24 };
    if (kind === 'plant') {
      const source = selectedSourcePlant();
      const item = source.item || {};
      layerName = 'Plants';
      label = quick.plantLabel || item.plantName || item.commonName || item.plant || 'Plant placeholder';
      width = 78; height = 78; sourceKind = source.kind;
      links = {
        relatedProjectPlantId: source.kind === 'projectPlant' ? item.projectPlantId : '',
        relatedSourcingRecordId: source.kind === 'sourcing' ? item.sourcingRecordId : item.sourcingRecordId || '',
      };
      style = {
        stroke: DESIGN_COLORS.deepGreen,
        fill: DESIGN_COLORS.olive,
        fillOpacity: .34,
        symbol: quick.symbol,
        quantity: 1,
        installationArea: item.installationLocation || '',
        matureSpreadFeet: number(String(item.matureSize || '').match(/[\d.]+/)?.[0]),
        customSpreadFeet: 0,
        showMatureSpread: false,
        showLabel: true,
        scientificName: item.scientificName || '',
        cultivar: item.cultivar || '',
        clientPrice: item.clientPrice || '',
        category: item.category || '',
      };
    } else if (kind === 'material') {
      const material = data.designMaterials.find(item => item.materialId === quick.materialId) || {};
      layerName = quick.materialType === 'Lighting' ? 'Lighting' : quick.materialType === 'Irrigation' ? 'Irrigation' : quick.materialType === 'Structure' ? 'Structures' : 'Materials';
      objectType = 'material';
      label = material.name || quick.materialType;
      width = 220; height = 150;
      links = { relatedMaterialId: material.materialId || '' };
      style = { stroke: DESIGN_COLORS.gold, fill: DESIGN_COLORS.gold, fillOpacity: .28, pattern: MATERIAL_PATTERNS[quick.materialType] || '', quantity: 1, finish: material.finish || '', clientPrice: material.clientPrice || '' };
    } else if (kind === 'overlay') {
      layerName = quick.overlayGroup;
      label = quick.overlayLabel;
      width = 250; height = 150;
      style = { stroke: quick.overlayGroup === 'Sun and Shade' ? DESIGN_COLORS.gold : DESIGN_COLORS.blueGray, fill: quick.overlayGroup === 'Sun and Shade' ? '#e9c963' : DESIGN_COLORS.blueGray, fillOpacity: .25 };
    } else if (kind === 'feature') {
      objectType = 'structure'; layerName = 'Existing Features'; label = quick.featureLabel; width = 190; height = 125;
      style = { stroke: DESIGN_COLORS.charcoal, fill: DESIGN_COLORS.blueGray, fillOpacity: .22 };
    } else if (kind === 'text') {
      objectType = 'label'; layerName = 'Labels';
    }
    const layer = layerForName(draftRef.current.layers, layerName) || currentLayer;
    return createDesignObject({
      projectId: project.projectId,
      clientId,
      conceptId,
      layerId: layer?.layerId || '',
      objectType,
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      zIndex: Math.max(...draftRef.current.objects.map(item => number(item.zIndex)), 0) + 1,
      label,
      sourceKind,
      clientVisible: ['plant', 'material', 'text', 'feature'].includes(kind),
      style,
      ...links,
    });
  };

  const onCanvasPointerDown = event => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest?.('[data-object-id]')) return;
    const point = canvasPoint(event);
    if (tool === 'select') {
      setSelectedId('');
      return;
    }
    if (tool === 'eraser') return;
    if (tool === 'pan') {
      interactionRef.current = { type: 'pan', start: point, initial: { x: draft.settings.viewportPanX, y: draft.settings.viewportPanY }, before: clone(draftRef.current) };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    if (['text', 'plant'].includes(tool)) {
      addObject(newObjectAt(point));
      return;
    }
    const layerName = tool === 'measurement' ? 'Measurements' : tool === 'polygon' ? 'Bed Outlines' : tool === 'overlay' ? quick.overlayGroup : tool === 'feature' ? 'Existing Features' : tool === 'material' ? 'Materials' : currentLayer?.name || 'Notes';
    const layer = layerForName(draft.layers, layerName) || currentLayer;
    const base = createDesignObject({
      projectId: project.projectId,
      clientId,
      conceptId,
      layerId: layer?.layerId || '',
      objectType: tool === 'pen' ? 'drawing' : tool,
      x: point.x,
      y: point.y,
      width: 1,
      height: 1,
      zIndex: Math.max(...draft.objects.map(item => number(item.zIndex)), 0) + 1,
      label: tool === 'measurement' ? quick.measurementLabel : tool === 'polygon' ? 'Bed outline' : tool === 'material' ? quick.materialType : tool === 'overlay' ? quick.overlayLabel : tool === 'feature' ? quick.featureLabel : '',
      clientVisible: ['measurement', 'polygon', 'material', 'feature'].includes(tool),
      style: {
        stroke: tool === 'highlighter' ? DESIGN_COLORS.gold : tool === 'overlay' ? DESIGN_COLORS.blueGray : DESIGN_COLORS.olive,
        strokeWidth: tool === 'highlighter' ? 18 : 4,
        strokeOpacity: tool === 'highlighter' ? .35 : 1,
        fill: tool === 'overlay' ? DESIGN_COLORS.blueGray : tool === 'material' ? DESIGN_COLORS.gold : DESIGN_COLORS.cream,
        fillOpacity: tool === 'overlay' ? .25 : tool === 'material' ? .28 : .18,
        pattern: tool === 'material' ? MATERIAL_PATTERNS[quick.materialType] || '' : '',
      },
      points: ['pen', 'highlighter'].includes(tool) ? [{ x: 0, y: 0 }] : [],
    });
    interactionRef.current = { type: 'draw', tool, start: point, before: clone(draftRef.current), object: base };
    setTempObject(base);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onCanvasPointerMove = event => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const point = canvasPoint(event);
    if (interaction.type === 'pan') {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const next = { ...draftRef.current, settings: { ...draftRef.current.settings, viewportPanX: interaction.initial.x - dx, viewportPanY: interaction.initial.y - dy } };
      setDraft(next); draftRef.current = next;
      return;
    }
    if (interaction.type === 'move') {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const next = { ...draftRef.current, objects: draftRef.current.objects.map(item => item.objectId === interaction.objectId ? { ...item, x: interaction.initial.x + dx, y: interaction.initial.y + dy } : item) };
      setDraft(next); draftRef.current = next;
      return;
    }
    if (interaction.type === 'resize') {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const next = { ...draftRef.current, objects: draftRef.current.objects.map(item => item.objectId === interaction.objectId ? { ...item, width: Math.max(12, interaction.initial.width + dx), height: Math.max(12, interaction.initial.height + dy) } : item) };
      setDraft(next); draftRef.current = next;
      return;
    }
    if (interaction.type === 'draw') {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      let object = { ...interaction.object };
      if (['pen', 'highlighter'].includes(interaction.tool)) {
        object.points = [...object.points, { x: point.x - interaction.start.x, y: point.y - interaction.start.y }];
      } else {
        object.width = dx;
        object.height = dy;
      }
      interaction.object = object;
      setTempObject(object);
    }
  };

  const finishInteraction = event => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    interactionRef.current = null;
    if (interaction.type === 'pan') {
      pushHistory(interaction.before, draftRef.current, 'Canvas panned');
      return;
    }
    if (['move', 'resize'].includes(interaction.type)) {
      pushHistory(interaction.before, draftRef.current, interaction.type === 'move' ? 'Object moved' : 'Object resized');
      return;
    }
    if (interaction.type !== 'draw') return;
    let object = interaction.object;
    setTempObject(null);
    if (['pen', 'highlighter'].includes(interaction.tool)) {
      if (object.points.length < 2) return;
      const xs = object.points.map(item => item.x);
      const ys = object.points.map(item => item.y);
      const minX = Math.min(...xs, 0);
      const minY = Math.min(...ys, 0);
      const maxX = Math.max(...xs, 0);
      const maxY = Math.max(...ys, 0);
      object = { ...object, x: object.x + minX, y: object.y + minY, width: Math.max(8, maxX - minX), height: Math.max(8, maxY - minY), points: object.points.map(point => ({ x: point.x - minX, y: point.y - minY })) };
    } else {
      const left = Math.min(object.x, object.x + object.width);
      const top = Math.min(object.y, object.y + object.height);
      object = { ...object, x: left, y: top, width: Math.max(8, Math.abs(object.width)), height: Math.max(8, Math.abs(object.height)) };
      if (interaction.tool === 'polygon') object.points = [{ x: 0, y: object.height * .2 }, { x: object.width * .35, y: 0 }, { x: object.width, y: object.height * .18 }, { x: object.width * .88, y: object.height }, { x: object.width * .1, y: object.height * .84 }];
    }
    if (object.width < 8 && object.height < 8) return;
    addObject(object);
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
  };

  const onObjectPointerDown = (event, object) => {
    event.stopPropagation();
    setSelectedId(object.objectId);
    if (tool === 'eraser') {
      if (!object.locked) {
        commit(current => ({ ...current, objects: current.objects.map(item => item.objectId === object.objectId ? { ...item, archived: true, updatedAt: now() } : item) }), 'Object erased');
        setSelectedId('');
      }
      return;
    }
    if (tool !== 'select' || object.locked || draft.layers.find(layer => layer.layerId === object.layerId)?.locked) return;
    const point = canvasPoint(event);
    const resize = event.target.closest?.('[data-resize-object]');
    interactionRef.current = {
      type: resize ? 'resize' : 'move',
      objectId: object.objectId,
      start: point,
      initial: resize ? { width: object.width, height: object.height } : { x: object.x, y: object.y },
      before: clone(draftRef.current),
    };
    sceneRef.current?.setPointerCapture?.(event.pointerId);
  };

  const calibrate = object => {
    const entered = prompt('Enter the real-world length in feet. Measurements remain approximate.', '');
    const feet = number(entered);
    if (!feet) return;
    const pixels = Math.hypot(number(object.width), number(object.height));
    updateSettings({ scaleCalibration: { calibrated: true, pixelsPerFoot: pixels / feet, pixelsPerInch: pixels / feet / 12, referenceObjectId: object.objectId, referencePixels: pixels, realLength: feet, unit: 'ft', note: 'Approximate visual planning aid — not a survey.' } }, 'Design scale calibrated');
  };

  const restoreVersion = version => {
    if (!confirm(`Restore ${version.name} to the live workspace? The current workspace will remain recoverable through Undo and saved versions.`)) return;
    const snapshot = clone(version.snapshot);
    commit(current => ({
      objects: snapshot.objects,
      layers: snapshot.layers,
      settings: { ...snapshot.canvasSettings, conceptId, projectId: project.projectId, clientId, revision: current.settings.revision },
    }), `Restored ${version.name}`);
  };

  const applyTemplate = template => {
    const added = applyDesignTemplate(template, { projectId: project.projectId, clientId, conceptId, layers: draft.layers, objects: draft.objects });
    commit(current => ({ ...current, objects: [...current.objects, ...added] }), `Template added: ${template.name}`);
  };

  useEffect(() => {
    const handler = event => {
      if (selectedTextInput(event.target)) return;
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (meta && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
      if (meta && event.key.toLowerCase() === 'c' && selected) { event.preventDefault(); copyRef.current = clone(selected); return; }
      if (meta && event.key.toLowerCase() === 'v' && copyRef.current) {
        event.preventDefault();
        const pasted = createDesignObject({ ...copyRef.current, id: undefined, objectId: undefined, x: number(copyRef.current.x) + 34, y: number(copyRef.current.y) + 34, legacySourceId: '' });
        addObject(pasted, 'Object pasted');
        return;
      }
      if ((meta && event.key.toLowerCase() === 'd') || (event.shiftKey && event.key.toLowerCase() === 'd')) { event.preventDefault(); duplicateSelected(); return; }
      if (['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); deleteSelected(); return; }
      if (event.key === 'Escape') { setSelectedId(''); setTempObject(null); interactionRef.current = null; return; }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); updateSettings({ viewportZoom: Math.min(2.4, number(draftRef.current.settings.viewportZoom) + .1) }, 'Canvas zoomed'); return; }
      if (event.key === '-') { event.preventDefault(); updateSettings({ viewportZoom: Math.max(.4, number(draftRef.current.settings.viewportZoom) - .1) }, 'Canvas zoomed'); return; }
      if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 2;
        patchLocalObject(selected.objectId, {
          x: number(selected.x) + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
          y: number(selected.y) + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
        }, 'Object moved with keyboard');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, undo, redo, deleteSelected, duplicateSelected, patchLocalObject]);

  const managementPanels = independent ? ['Versions', 'Compare', 'Notes', 'Templates', 'Export'] : ['Versions', 'Compare', 'Plant Sync', 'Estimate Review', 'Legends & Costs', 'Notes', 'Templates', 'Export'];
  const costs = designCostSummary(data, project.projectId, draft.objects);
  const saveConsultationRevision = () => {
    const record = createDesignVersion({
      projectId: project.projectId,
      clientId,
      conceptId,
      parentVersionId: versions[0]?.versionId || '',
      name: `Client Revision ${versions.filter(item => item.name.startsWith('Client Revision')).length + 1}`,
      revisionNotes: 'Saved during Live Consultation Mode',
      objects: draft.objects,
      layers: draft.layers,
      canvasSettings: draft.settings,
    });
    setData(current => ({ ...current, designVersions: [record, ...current.designVersions] }));
    persist(true);
    setSaveState('Consultation revision saved');
  };
  return <div className={`interactive-design-studio${consultation ? ' consultation-mode' : ''}`}>
    <header className="interactive-studio-header glass">
      <div><span>{independent ? 'Independent Design · Interactive Studio' : 'Phase 6 · Interactive Design Studio'}</span><h3>{concept.name}</h3><p>{concept.description || 'Visual landscape planning workspace'}</p></div>
      <div className="studio-save-cluster"><span className={`save-status ${dirty ? 'saving' : 'saved'}`} role="status">{saveState}</span><button type="button" onClick={() => persist(true)}>Save now</button>{!independent && <button type="button" onClick={() => setConsultation(true)}>Live Consultation</button>}</div>
    </header>
    <WorkspaceToolbar tool={tool} setTool={setTool} undo={undo} redo={redo} canUndo={history.length > 0} canRedo={future.length > 0} zoom={draft.settings.viewportZoom} setZoom={value => updateSettings({ viewportZoom: value }, 'Canvas zoomed')} consultation={consultation} />
    <QuickAddControls tool={tool} draft={draft} data={data} project={project} quick={quick} setQuick={setQuick} />
    <BackgroundControls settings={draft.settings} photos={photos} updateSettings={updateSettings} />
    <div className="interactive-studio-grid">
      {!consultation && <LayerManager layers={draft.layers} objects={draft.objects} updateLayers={updateLayers} selectLayer={setSelectedLayerId} selectedLayerId={currentLayer?.layerId} />}
      <section className="interactive-canvas-column">
        <div className="interactive-canvas-frame glass">
          <DesignScene
            objects={draft.objects}
            layers={draft.layers}
            settings={draft.settings}
            photos={photos}
            selectedId={selectedId}
            onObjectPointerDown={onObjectPointerDown}
            onObjectClick={object => setSelectedId(object.objectId)}
            interactive
            sceneRef={sceneRef}
            tempObject={tempObject}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={finishInteraction}
          />
          <div className="canvas-planning-notice">Approximate visual planning workspace · not survey, engineering, CAD, GIS, or construction documentation</div>
        </div>
        <div className="canvas-view-controls glass">
          <label><input type="checkbox" checked={draft.settings.gridVisible} onChange={event => updateSettings({ gridVisible: event.target.checked }, 'Grid changed')} /> Grid</label>
          <label><input type="checkbox" checked={draft.settings.showAllMatureSpread} onChange={event => updateSettings({ showAllMatureSpread: event.target.checked }, 'Mature spread display changed')} /> Mature-spread circles</label>
          <button type="button" onClick={() => updateSettings({ scaleCalibration: { ...draft.settings.scaleCalibration, calibrated: false, pixelsPerFoot: 0, pixelsPerInch: 0, referenceObjectId: '' } }, 'Scale reset')}>Reset scale</button>
          <span>{draft.settings.scaleCalibration?.calibrated ? `Approx. scale · ${number(draft.settings.scaleCalibration.pixelsPerFoot).toFixed(2)} px/ft` : 'Scale uncalibrated'}</span>
        </div>
      </section>
      {!consultation && <ObjectInspector object={selected} layers={draft.layers} objects={draft.objects} settings={draft.settings} patchObject={patchSelected} duplicateObject={duplicateSelected} deleteObject={deleteSelected} moveZ={moveZ} calibrate={calibrate} />}
    </div>
    {consultation && <div className="consultation-dock glass">
      <div><span>Live Consultation Mode</span><strong>Private notes, internal costs, nursery details, profit, and administration are hidden.</strong></div>
      <label>Version<select defaultValue="" onChange={event => { const version = versions.find(item => item.versionId === event.target.value); if (version) restoreVersion(version); event.target.value = ''; }}><option value="">Current live design</option>{versions.map(item => <option key={item.versionId} value={item.versionId}>{item.name}</option>)}</select></label>
      <label><input type="checkbox" checked={showConsultationCosts} onChange={event => setShowConsultationCosts(event.target.checked)} /> Client-facing cost summary</label>
      {showConsultationCosts && <output>{money(costs.total)}</output>}
      <button type="button" onClick={saveConsultationRevision}>Save revision</button>
      <button type="button" className="primary" onClick={() => setConsultation(false)}>Exit consultation</button>
    </div>}
    {!consultation && <>
      <nav className="studio-management-tabs" aria-label="Design workspace records">{managementPanels.map(item => <button type="button" key={item} className={panel === item ? 'active' : ''} onClick={() => setPanel(item)}>{item}</button>)}</nav>
      {panel === 'Versions' && <VersionPanel data={data} setData={setData} project={project} concept={concept} draft={draft} versions={versions} restoreVersion={restoreVersion} openPresentation={openPresentation} independent={independent} />}
      {panel === 'Compare' && <ComparePanel versions={versions} photos={photos} />}
      {panel === 'Plant Sync' && <SyncPanel data={data} setData={setData} project={project} concept={concept} objects={draft.objects} patchLocalObject={patchLocalObject} />}
      {panel === 'Estimate Review' && <EstimateReviewPanel data={data} setData={setData} project={project} objects={draft.objects} patchLocalObject={patchLocalObject} />}
      {panel === 'Legends & Costs' && <LegendsAndCosts data={data} setData={setData} project={project} concept={concept} objects={draft.objects} />}
      {panel === 'Notes' && <NotesPanel data={data} setData={setData} project={project} concept={concept} versions={versions} selectedObject={selected} />}
      {panel === 'Templates' && <TemplatePanel templates={data.designTemplates} applyTemplate={applyTemplate} />}
      {panel === 'Export' && <ExportPanel data={data} setData={setData} project={project} concept={concept} objects={draft.objects} layers={draft.layers} settings={draft.settings} photos={photos} sceneRef={sceneRef} />}
    </>}
  </div>;
}
