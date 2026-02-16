import React, { useState, useEffect, useRef, useCallback } from 'react';

// Initial game state
const INITIAL_STATE = {
  money: 50,
  unitCoin: 0,
  unitCoinPrice: 1.00,
  priceHistory: [1.00],
  canvasLevel: 1, // 1 = 100%, 2 = 75%, 3 = 50%
};

// Canvas zoom prices
const CANVAS_PRICES = {
  2: 500,
  3: 2000,
};

const CANVAS_SCALES = {
  1: 1,
  2: 0.75,
  3: 0.5,
};

// Component definitions
const COMPONENTS = {
  cpu: {
    'cpu-1': { name: 'Qnit 1000', cores: 1, speed: 3, power: 65, temp: 45, price: 0 },
    'cpu-2': { name: 'Qnit 2000', cores: 2, speed: 3.5, power: 95, temp: 55, price: 150 },
    'cpu-3': { name: 'Qnit 3000', cores: 3, speed: 3.8, power: 110, temp: 60, price: 300 },
    'cpu-4': { name: 'Qnit 4000', cores: 4, speed: 4.2, power: 125, temp: 65, price: 500 },
  },
  gpu: {
    'gpu-8': { name: 'nWOLF 550', vram: 8, hashRate: 10, power: 75, temp: 50, price: 0 },
    'gpu-10': { name: 'nWOLF 550ti', vram: 10, hashRate: 15, power: 95, temp: 55, price: 150 },
    'gpu-12': { name: 'nWOLF 1010', vram: 12, hashRate: 25, power: 150, temp: 62, price: 350 },
    'gpu-14': { name: 'nWOLF 1010ti', vram: 14, hashRate: 40, power: 200, temp: 70, price: 600 },
    'gpu-24': { name: 'nWOLF Quantum Research', vram: 24, hashRate: 80, power: 320, temp: 78, price: 1200 },
  },
  ram: {
    'ram-8': { name: 'aDEP 8GB DDR4', size: 8, speed: 3200, power: 5, temp: 35, price: 0, multiplier: 1 },
    'ram-16': { name: 'aDEP 16GB DDR4', size: 16, speed: 3600, power: 8, temp: 38, price: 80, multiplier: 1 },
    'ram-32': { name: 'aDEP 32GB DDR4', size: 32, speed: 3600, power: 12, temp: 42, price: 200, multiplier: 1 },
    'ram-8-p': { name: 'aDEP 8GB PERF DDR5', size: 8, speed: 4800, power: 6, temp: 32, price: 60, multiplier: 1.15 },
    'ram-16-p': { name: 'aDEP 16GB PERF DDR5', size: 16, speed: 5200, power: 10, temp: 35, price: 150, multiplier: 1.2 },
    'ram-32-p': { name: 'aDEP 32GB PERF DDR5', size: 32, speed: 5600, power: 14, temp: 38, price: 350, multiplier: 1.25 },
  },
  os: {
    'trader-os': { name: 'TraderOS v1', features: ['buy', 'sell'], programSlots: 1, price: 0 },
    'trader-os-2': { name: 'TraderOS v2', features: ['buy', 'sell'], programSlots: 2, ramReq: 16, price: 200 },
    'miner-os': { name: 'MinerOS Pro', features: ['buy', 'sell', 'automine'], programSlots: 3, ramReq: 32, price: 500 },
    'miner-os-2': { name: 'MinerOS Ultra', features: ['buy', 'sell', 'automine', 'boost'], programSlots: 4, ramReq: 64, price: 1200 },
  },
  cooling: {
    'fan-1': { name: 'OnlyFans Case Fan', tempReduction: 8, power: 5, price: 30 },
    'fan-2': { name: 'OnlyFans Case Duo', tempReduction: 15, power: 10, price: 75 },
    'aio': { name: 'OnlyAIO Fan + Radiator', tempReduction: 25, power: 15, price: 200 },
    'loop': { name: 'gUNIT Tundra Loop', tempReduction: 40, power: 20, price: 500 },
  },
  program: {
    'cpuburner': { name: 'CPUBurner', description: 'CPU Overclock Manager', price: 75, target: 'cpu', ramReq: 4 },
    'gpuburner': { name: 'GPUBurner', description: 'GPU Overclock Manager', price: 100, target: 'gpu', ramReq: 4 },
    'ramburner': { name: 'RAMBurner', description: 'RAM Overclock Manager', price: 50, target: 'ram', ramReq: 2 },
    'bitwatcher': { name: 'BitWatcher', description: 'Mining Progress Visualizer', price: 60, target: 'display', ramReq: 8 },
    'uhrome': { name: 'Uhrome Browser', description: 'Web Browser', price: 0, target: 'browser', ramReq: 6 },
  },
};

// Transformer definitions
const TRANSFORMERS = {
  'transformer-small': { name: 'gUnit 500W Battery', wattage: 500, tickFee: 0.01, price: 200 },
  'transformer-medium': { name: 'gUnit 1000W Battery', wattage: 1000, tickFee: 0.03, price: 500 },
  'transformer-large': { name: 'gUnit Pro Zenith 2500W', wattage: 2500, tickFee: 0.08, price: 1200 },
};

const OVERHEAT_THRESHOLD = 95;

// Calculate UGS
const calculateUGS = (cpu, gpu, ramSlots, cpuOC = 0, gpuOC = 0, ramOC = 0) => {
  if (!cpu || !gpu) return 0;
  const cpuData = COMPONENTS.cpu[cpu];
  const gpuData = COMPONENTS.gpu[gpu];
  
  let totalRam = 0;
  let ddr5Multiplier = 1;
  ramSlots.forEach(ram => {
    if (ram && COMPONENTS.ram[ram]) {
      const ramData = COMPONENTS.ram[ram];
      totalRam += ramData.size;
      ddr5Multiplier = Math.max(ddr5Multiplier, ramData.multiplier || 1);
    }
  });
  
  const ramFactor = Math.log2(totalRam + 1) / 4;
  
  // Apply individual OC multipliers
  const cpuMultiplier = 1 + cpuOC / 100;
  const gpuMultiplier = 1 + gpuOC / 100;
  const ramOCMultiplier = 1 + ramOC / 200; // RAM OC has less impact
  
  const baseUGS = (gpuData.hashRate * gpuMultiplier * cpuData.cores * cpuData.speed * cpuMultiplier * ramFactor * ramOCMultiplier * ddr5Multiplier) / 100;
  return baseUGS;
};

// Calculate power
const calculatePowerDraw = (cpu, gpu, ramSlots, cooling = null, cpuOC = 0, gpuOC = 0, ramOC = 0) => {
  let total = 0;
  if (cpu) total += COMPONENTS.cpu[cpu].power * (1 + cpuOC / 200);
  if (gpu) total += COMPONENTS.gpu[gpu].power * (1 + gpuOC / 150);
  ramSlots.forEach(ram => { if (ram) total += COMPONENTS.ram[ram].power * (1 + ramOC / 300); });
  if (cooling) total += COMPONENTS.cooling[cooling].power;
  return Math.round(total);
};

// Calculate temperature
const calculateTemp = (cpu, gpu, ramSlots, isPowered, cooling = null, cpuOC = 0, gpuOC = 0, ramOC = 0) => {
  if (!isPowered) return 25;
  let temps = [];
  if (cpu) temps.push(COMPONENTS.cpu[cpu].temp + cpuOC * 0.6);
  if (gpu) temps.push(COMPONENTS.gpu[gpu].temp + gpuOC * 0.5);
  ramSlots.forEach(ram => { if (ram) temps.push(COMPONENTS.ram[ram].temp + ramOC * 0.2); });
  if (temps.length === 0) return 25;
  
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  let baseTemp = (avgTemp * 0.6 + maxTemp * 0.4);
  
  // Cooling reduces temp
  if (cooling) baseTemp -= COMPONENTS.cooling[cooling].tempReduction;
  
  return Math.round(Math.max(25, baseTemp) + (Math.random() * 2 - 1));
};

const getTempColor = (temp) => {
  if (temp < 40) return '#22c55e';
  if (temp < 55) return '#84cc16';
  if (temp < 70) return '#eab308';
  if (temp < 85) return '#f97316';
  return '#ef4444';
};

// Connector
const Connector = ({ direction, color, connected, nodeId, connectorId, onStartConnection, onEndConnection, onDisconnect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="connector"
      onMouseDown={(e) => { e.stopPropagation(); if (direction === 'output' && !connected) onStartConnection(nodeId, connectorId, color); }}
      onMouseUp={(e) => { e.stopPropagation(); if (direction === 'input') onEndConnection(nodeId, connectorId); }}
      onClick={(e) => { e.stopPropagation(); if (direction === 'input' && connected && onDisconnect) onDisconnect(nodeId, connectorId); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={direction === 'input' && connected ? 'Click to disconnect' : ''}
      style={{
        width: '14px', height: '14px', borderRadius: '50%',
        background: connected ? color : `${color}40`,
        border: `2px solid ${color}`,
        boxShadow: connected || isHovered ? `0 0 10px ${color}` : 'none',
        cursor: direction === 'input' && connected ? 'pointer' : 'crosshair',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
      }}
    />
  );
};

// Component Slot
const ComponentSlot = ({ type, installed, color, onDrop, label, size = 'normal' }) => {
  const [isOver, setIsOver] = useState(false);
  const isSmall = size === 'small';

  return (
    <div
      className="slot"
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setIsOver(false);
        const itemId = e.dataTransfer.getData('itemId');
        const itemType = e.dataTransfer.getData('itemType');
        if (itemType === type) onDrop(itemId);
      }}
      style={{
        background: isOver ? `${color}30` : 'rgba(0,0,0,0.4)',
        border: `2px ${installed ? 'solid' : 'dashed'} ${isOver ? color : `${color}50`}`,
        borderRadius: '5px', padding: isSmall ? '4px 6px' : '8px',
        minWidth: isSmall ? '50px' : '100%',
        transition: 'all 0.2s ease',
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span style={{ color, fontSize: isSmall ? '9px' : '11px' }}>{label}</span>
        <span style={{ color: installed ? color : '#555', fontSize: isSmall ? '8px' : '10px', fontWeight: 500 }}>
          {installed ? (isSmall && COMPONENTS[type]?.[installed]?.size ? COMPONENTS[type][installed].size + 'GB' : COMPONENTS[type]?.[installed]?.name || installed) : 'Empty'}
        </span>
      </div>
    </div>
  );
};

// Draggable wrapper
const DraggableNode = ({ id, position, onPositionChange, children, scale = 1 }) => {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.connector') || e.target.closest('.slot') || e.target.closest('button') || e.target.closest('input')) return;
    const rect = nodeRef.current.getBoundingClientRect();
    setDragOffset({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const parentRect = nodeRef.current.parentElement.getBoundingClientRect();
      const newX = (e.clientX - parentRect.left) / scale - dragOffset.x;
      const newY = (e.clientY - parentRect.top) / scale - dragOffset.y;
      onPositionChange(id, { x: Math.max(0, newX), y: Math.max(0, newY) });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, dragOffset, id, onPositionChange, scale]);

  return (
    <div ref={nodeRef} onMouseDown={handleMouseDown} style={{ position: 'absolute', left: position.x, top: position.y, cursor: isDragging ? 'grabbing' : 'grab', zIndex: isDragging ? 100 : 10 }}>
      {children}
    </div>
  );
};

// Power Grid
const PowerGridNode = ({ connected, totalWattage, onStartConnection, onEndConnection }) => (
  <div style={{ background: 'linear-gradient(135deg, rgba(40,35,20,0.95), rgba(25,22,12,0.98))', border: '2px solid #ffcc00', borderRadius: '10px', padding: '12px', minWidth: '160px', boxShadow: '0 0 20px rgba(255,204,0,0.3)' }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">⚡</span>
      <div>
        <div className="text-yellow-400 font-bold text-xs">GFI Home Unit</div>
        <div className="text-yellow-600 text-xs">120V • {totalWattage}W</div>
      </div>
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-yellow-900">
      <span className="text-yellow-600 text-xs">Out</span>
      <Connector direction="output" color="#ffcc00" connected={connected} nodeId="power-grid" connectorId="power-out" onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
    </div>
  </div>
);

// Transformer
const TransformerNode = ({ id, type, powerConnected, outputConnected, onStartConnection, onEndConnection, onDisconnect }) => {
  const data = TRANSFORMERS[type];
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(50,40,20,0.95), rgba(35,28,12,0.98))', border: `2px solid ${powerConnected ? '#ff9500' : '#555'}`, borderRadius: '10px', padding: '12px', minWidth: '180px', boxShadow: powerConnected ? '0 0 20px rgba(255,149,0,0.3)' : 'none' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🔋</span>
        <div>
          <div className="text-orange-400 font-bold text-xs">{data.name}</div>
          <div className="text-orange-600 text-xs">+{data.wattage}W • ${data.tickFee}/s</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
        <Connector direction="input" color="#ffcc00" connected={powerConnected} nodeId={id} connectorId="power-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
        <span className="text-yellow-600 text-xs">IN</span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-orange-900">
        <span className="text-orange-600 text-xs">OUT</span>
        <Connector direction="output" color="#ff9500" connected={outputConnected} nodeId={id} connectorId="power-out" onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
      </div>
    </div>
  );
};

// Power Strip
const PowerStripNode = ({ id, powerConnected, outputs, onStartConnection, onEndConnection, onDisconnect }) => (
  <div style={{ background: 'linear-gradient(135deg, rgba(35,32,20,0.95), rgba(22,20,12,0.98))', border: `2px solid ${powerConnected ? '#ffcc00' : '#555'}`, borderRadius: '10px', padding: '12px', minWidth: '180px', boxShadow: powerConnected ? '0 0 15px rgba(255,204,0,0.2)' : 'none' }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🔌</span>
      <div>
        <div className="text-yellow-400 font-bold text-xs">Power Strip</div>
        <div className="text-yellow-600 text-xs">4-Way</div>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
      <Connector direction="input" color="#ffcc00" connected={powerConnected} nodeId={id} connectorId="power-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
      <span className="text-yellow-600 text-xs">IN</span>
      <span className={`ml-auto text-xs ${powerConnected ? 'text-green-400' : 'text-gray-500'}`}>{powerConnected ? '●' : '○'}</span>
    </div>
    <div className="grid grid-cols-2 gap-1">
      {[0,1,2,3].map(i => (
        <div key={i} className="flex items-center justify-between p-1.5 rounded bg-black/30">
          <span className="text-yellow-700 text-xs">{i+1}</span>
          <Connector direction="output" color="#ffcc00" connected={outputs[i]} nodeId={id} connectorId={`power-out-${i}`} onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
        </div>
      ))}
    </div>
  </div>
);

// PC Node
const PCNode = ({ id, cpu, gpu, ram, cooling, os, powerConnected, displayConnected, programConnections, cpuOC, gpuOC, ramOC, isOverheated, currentTemp, onSlotDrop, onStartConnection, onEndConnection, onDisconnect }) => {
  const powerDraw = calculatePowerDraw(cpu, gpu, ram, cooling, cpuOC, gpuOC, ramOC);
  const ugs = calculateUGS(cpu, gpu, ram, cpuOC, gpuOC, ramOC);
  const tempColor = getTempColor(currentTemp);
  const totalOC = cpuOC + gpuOC + ramOC;
  
  // Get program slots from OS
  const osData = os ? COMPONENTS.os[os] : null;
  const programSlots = osData?.programSlots || 1;
  
  // Calculate total RAM
  const totalRam = ram.reduce((sum, r) => r ? sum + COMPONENTS.ram[r].size : sum, 0);

  return (
    <div 
      style={{ 
        background: isOverheated ? 'linear-gradient(135deg, rgba(60,20,20,0.95), rgba(40,15,15,0.98))' : 'linear-gradient(135deg, rgba(25,30,45,0.95), rgba(15,20,30,0.98))', 
        border: `2px solid ${isOverheated ? '#ef4444' : powerConnected ? '#00ff88' : '#333'}`, 
        borderRadius: '10px', padding: '12px', minWidth: '260px',
        boxShadow: isOverheated ? '0 0 30px rgba(239,68,68,0.4)' : powerConnected ? '0 0 25px rgba(0,255,136,0.15)' : 'none',
        animation: isOverheated ? 'pulse-red 1s infinite' : 'none',
      }}
      title={isOverheated ? 'PC Overheated! Wait for it to cool down. Overclock settings cleared.' : ''}
    >
      <style>{`@keyframes pulse-red { 0%, 100% { box-shadow: 0 0 30px rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 50px rgba(239,68,68,0.6); } }`}</style>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isOverheated ? '⚠️' : '🖥️'}</span>
          <div>
            <div className="text-white font-bold text-xs">Gaming PC</div>
            <div className={`text-xs ${isOverheated ? 'text-red-400' : powerConnected ? 'text-green-400' : 'text-gray-500'}`}>
              {isOverheated ? '🔥 OVERHEATED' : powerConnected ? '● ON' : '○ OFF'}
            </div>
          </div>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <div className="flex items-center justify-end gap-1">
            <span className="text-gray-500">T</span>
            <span style={{ color: tempColor }} className="font-mono">{currentTemp}°C</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="text-gray-500">W</span>
            <span className="text-yellow-400 font-mono">{powerDraw}</span>
          </div>
          {totalOC > 0 && !isOverheated && (
            <div className="flex items-center justify-end gap-1">
              <span className="text-red-400 font-mono text-xs">OC:{cpuOC}/{gpuOC}/{ramOC}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
        <Connector direction="input" color="#ffcc00" connected={powerConnected} nodeId={id} connectorId="power-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
        <span className="text-yellow-600 text-xs">PWR</span>
      </div>

      <div className="space-y-1.5 mb-2">
        <ComponentSlot type="cpu" installed={cpu} color="#00d4ff" label="CPU" onDrop={(itemId) => onSlotDrop('cpu', itemId)} />
        <ComponentSlot type="gpu" installed={gpu} color="#ff6b00" label="GPU" onDrop={(itemId) => onSlotDrop('gpu', itemId)} />
        <div className="flex gap-1">
          {ram.map((slot, i) => (
            <ComponentSlot key={i} type="ram" installed={slot} color="#b44aff" label={`R${i+1}`} size="small" onDrop={(itemId) => onSlotDrop('ram', itemId, i)} />
          ))}
        </div>
        <ComponentSlot type="cooling" installed={cooling} color="#06b6d4" label="COOL" onDrop={(itemId) => onSlotDrop('cooling', itemId)} />
        <ComponentSlot type="os" installed={os} color="#22c55e" label="OS" onDrop={(itemId) => onSlotDrop('os', itemId)} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-700 mb-1.5">
        <span className="text-blue-400 text-xs">Display</span>
        <Connector direction="output" color="#3b82f6" connected={displayConnected} nodeId={id} connectorId="display-out" onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
      </div>
      
      {/* Program slots based on OS */}
      <div className="pt-1.5 border-t border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-purple-400 text-xs">Programs ({programSlots} slot{programSlots > 1 ? 's' : ''})</span>
          <span className="text-gray-500 text-xs">{totalRam}GB RAM</span>
        </div>
        <div className="flex gap-1">
          {[...Array(programSlots)].map((_, i) => (
            <div key={i} className="flex items-center gap-1 p-1 rounded bg-black/30">
              <span className="text-purple-600 text-xs">P{i+1}</span>
              <Connector 
                direction="output" 
                color="#a855f7" 
                connected={programConnections?.[i]} 
                nodeId={id} 
                connectorId={`program-out-${i}`} 
                onStartConnection={onStartConnection} 
                onEndConnection={onEndConnection} 
              />
            </div>
          ))}
        </div>
      </div>

      {powerConnected && !isOverheated && (
        <div className="mt-2 p-1.5 rounded bg-green-900/30 border border-green-800/50">
          <div className="flex justify-between items-center">
            <span className="text-green-500 text-xs">⛏️</span>
            <span className="text-green-400 font-mono text-xs font-bold">{(ugs / 60).toFixed(6)}/s</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Miner Node
const MinerNode = ({ id, powerConnected, displayConnected, onStartConnection, onEndConnection, onDisconnect }) => (
  <div style={{ background: 'linear-gradient(135deg, rgba(30,25,40,0.95), rgba(20,15,30,0.98))', border: `2px solid ${powerConnected ? '#a855f7' : '#333'}`, borderRadius: '10px', padding: '12px', minWidth: '170px', boxShadow: powerConnected ? '0 0 20px rgba(168,85,247,0.2)' : 'none' }}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">⛏️</span>
        <div>
          <div className="text-purple-300 font-bold text-xs">aSIC B1 UGS Miner</div>
          <div className={`text-xs ${powerConnected ? 'text-purple-400' : 'text-gray-500'}`}>{powerConnected ? '● MINING' : '○ OFF'}</div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
      <Connector direction="input" color="#ffcc00" connected={powerConnected} nodeId={id} connectorId="power-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
      <span className="text-yellow-600 text-xs">PWR</span>
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
      <span className="text-blue-400 text-xs">Data</span>
      <Connector direction="output" color="#3b82f6" connected={displayConnected} nodeId={id} connectorId="display-out" onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
    </div>
    {powerConnected && (
      <div className="mt-2 p-1.5 rounded bg-purple-900/30 border border-purple-800/50">
        <div className="flex justify-between items-center">
          <span className="text-purple-400 text-xs">UGS</span>
          <span className="text-purple-300 font-mono text-xs font-bold">0.0167/s</span>
        </div>
      </div>
    )}
  </div>
);

// Interface Hub Node - allows multiple display inputs to one interface
const InterfaceHubNode = ({ id, inputConnections, outputConnected, onStartConnection, onEndConnection, onDisconnect }) => {
  const connectedCount = inputConnections.filter(Boolean).length;
  
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(25,30,50,0.95), rgba(15,20,35,0.98))', border: `2px solid ${connectedCount > 0 ? '#3b82f6' : '#333'}`, borderRadius: '10px', padding: '12px', minWidth: '200px', boxShadow: connectedCount > 0 ? '0 0 20px rgba(59,130,246,0.2)' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔀</span>
          <div>
            <div className="text-blue-400 font-bold text-xs">Interface Hub</div>
            <div className={`text-xs ${connectedCount > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
              {connectedCount > 0 ? `● ${connectedCount} Signal${connectedCount > 1 ? 's' : ''}` : '○ No Signal'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Display Inputs */}
      <div className="mb-2">
        <div className="text-blue-500 text-xs mb-1">Display Inputs</div>
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1 p-1.5 rounded bg-black/40">
              <Connector
                direction="input"
                color="#3b82f6"
                connected={inputConnections[i]}
                nodeId={id}
                connectorId={`display-in-${i}`}
                onStartConnection={onStartConnection}
                onEndConnection={onEndConnection}
                onDisconnect={onDisconnect}
              />
              <span className="text-blue-600 text-xs">IN{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Output */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <span className="text-green-400 text-xs">Signal Out</span>
        <Connector
          direction="output"
          color="#22c55e"
          connected={outputConnected}
          nodeId={id}
          connectorId="signal-out"
          onStartConnection={onStartConnection}
          onEndConnection={onEndConnection}
        />
      </div>
    </div>
  );
};

// Uhrome Browser Component with tabs for YouBet and SkinMonkey
const UhromeBrowser = ({ id, pcConnected, miningProgress, onBetUnitCoin, onSpendMoney, money, onStartConnection, onEndConnection, onDisconnect }) => {
  const [activeTab, setActiveTab] = useState('youbet');
  const [url, setUrl] = useState('youbet.uc');
  
  // YouBet Blackjack state
  const [bjGameState, setBjGameState] = useState('betting');
  const [bet, setBet] = useState('0.10');
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [bjMessage, setBjMessage] = useState('Place your bet!');
  const [lastWin, setLastWin] = useState(0);
  
  // SkinMonkey state
  const [isUnboxing, setIsUnboxing] = useState(false);
  const [unboxedItem, setUnboxedItem] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [showInventory, setShowInventory] = useState(false);

  // CS:GO-like case items with real odds
  // Blue (Mil-Spec): 79.92%, Purple (Restricted): 15.98%, Pink (Classified): 3.2%, Red (Covert): 0.64%, Gold (Knife/Rare): 0.26%
  const CASE_ITEMS = [
    { name: 'Battle-Scarred P250', rarity: 'blue', color: '#4b69ff', value: 0.15, odds: 19.98 },
    { name: 'Field-Tested Tec-9', rarity: 'blue', color: '#4b69ff', value: 0.20, odds: 19.98 },
    { name: 'Minimal Wear MP7', rarity: 'blue', color: '#4b69ff', value: 0.35, odds: 19.98 },
    { name: 'Factory New Nova', rarity: 'blue', color: '#4b69ff', value: 0.50, odds: 19.98 },
    { name: 'StatTrak Negev', rarity: 'purple', color: '#8847ff', value: 1.50, odds: 5.33 },
    { name: 'AWP Electric Hive', rarity: 'purple', color: '#8847ff', value: 3.00, odds: 5.33 },
    { name: 'AK-47 Redline', rarity: 'purple', color: '#8847ff', value: 5.00, odds: 5.32 },
    { name: 'M4A1-S Hyper Beast', rarity: 'pink', color: '#d32ce6', value: 12.00, odds: 1.60 },
    { name: 'USP-S Kill Confirmed', rarity: 'pink', color: '#d32ce6', value: 18.00, odds: 1.60 },
    { name: 'AK-47 Vulcan', rarity: 'red', color: '#eb4b4b', value: 45.00, odds: 0.32 },
    { name: 'AWP Asiimov', rarity: 'red', color: '#eb4b4b', value: 65.00, odds: 0.32 },
    { name: '★ Karambit Fade', rarity: 'gold', color: '#ffd700', value: 800.00, odds: 0.065 },
    { name: '★ M9 Bayonet Doppler', rarity: 'gold', color: '#ffd700', value: 450.00, odds: 0.065 },
    { name: '★ Butterfly Knife', rarity: 'gold', color: '#ffd700', value: 350.00, odds: 0.065 },
    { name: '★ Huntsman Knife', rarity: 'gold', color: '#ffd700', value: 150.00, odds: 0.065 },
  ];

  const CASE_PRICE = 2.50;

  // Blackjack functions
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const getRandomCard = () => ({ suit: suits[Math.floor(Math.random() * 4)], value: values[Math.floor(Math.random() * 13)] });
  const getCardValue = (card) => ['J', 'Q', 'K'].includes(card.value) ? 10 : card.value === 'A' ? 11 : parseInt(card.value);
  
  const calculateHand = (hand) => {
    let total = 0, aces = 0;
    hand.forEach(card => { total += getCardValue(card); if (card.value === 'A') aces++; });
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  };

  const startBJ = () => {
    const betAmount = parseFloat(bet) || 0;
    if (betAmount <= 0) { setBjMessage('Enter a valid bet!'); return; }
    if (miningProgress < betAmount) { setBjMessage('Not enough UC!'); return; }
    onBetUnitCoin(-betAmount);
    const pHand = [getRandomCard(), getRandomCard()];
    const dHand = [getRandomCard(), getRandomCard()];
    setPlayerHand(pHand); setDealerHand(dHand); setBjGameState('playing');
    if (calculateHand(pHand) === 21) { setBjMessage('BLACKJACK!'); setTimeout(() => endBJ(pHand, dHand, true, betAmount), 500); }
    else setBjMessage('Hit or Stand?');
  };

  const hitBJ = () => {
    const betAmount = parseFloat(bet) || 0;
    const newHand = [...playerHand, getRandomCard()];
    setPlayerHand(newHand);
    const total = calculateHand(newHand);
    if (total > 21) { setBjMessage('BUST!'); setBjGameState('result'); setLastWin(0); }
    else if (total === 21) standBJ(newHand, betAmount);
  };

  const standBJ = (currentHand = playerHand, betAmount = parseFloat(bet) || 0) => {
    setBjGameState('dealer');
    let dHand = [...dealerHand];
    const dealerPlay = () => {
      if (calculateHand(dHand) < 17) { dHand = [...dHand, getRandomCard()]; setDealerHand(dHand); setTimeout(dealerPlay, 400); }
      else endBJ(currentHand, dHand, false, betAmount);
    };
    setTimeout(dealerPlay, 400);
  };

  const endBJ = (pHand, dHand, isBlackjack = false, betAmount = parseFloat(bet) || 0) => {
    const pTotal = calculateHand(pHand), dTotal = calculateHand(dHand);
    setBjGameState('result');
    let winAmount = 0;
    if (isBlackjack && dTotal !== 21) { winAmount = betAmount * 2.5; setBjMessage('BLACKJACK!'); }
    else if (pTotal > 21) setBjMessage('Bust!');
    else if (dTotal > 21) { winAmount = betAmount * 2; setBjMessage('Dealer busts!'); }
    else if (pTotal > dTotal) { winAmount = betAmount * 2; setBjMessage('You win!'); }
    else if (pTotal < dTotal) setBjMessage('Dealer wins.');
    else { winAmount = betAmount; setBjMessage('Push!'); }
    if (winAmount > 0) onBetUnitCoin(winAmount);
    setLastWin(winAmount);
  };

  const newBJ = () => { setBjGameState('betting'); setPlayerHand([]); setDealerHand([]); setBjMessage('Place your bet!'); setLastWin(0); };

  const renderCard = (card, hidden = false) => (
    <div style={{ width: '28px', height: '40px', background: hidden ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' : 'white', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: hidden ? '#60a5fa' : (card.suit === '♥' || card.suit === '♦') ? '#dc2626' : '#000', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '1px solid #333' }}>
      {hidden ? '?' : `${card.value}${card.suit}`}
    </div>
  );

  // SkinMonkey functions
  const openCase = () => {
    if (money < CASE_PRICE) return;
    onSpendMoney(CASE_PRICE);
    setIsUnboxing(true);
    setUnboxedItem(null);
    
    setTimeout(() => {
      const roll = Math.random() * 100;
      let cumulative = 0;
      let selectedItem = CASE_ITEMS[0];
      for (const item of CASE_ITEMS) {
        cumulative += item.odds;
        if (roll < cumulative) { selectedItem = item; break; }
      }
      setUnboxedItem(selectedItem);
      setIsUnboxing(false);
    }, 2000);
  };

  const keepItem = () => {
    if (unboxedItem) {
      setInventory(prev => [...prev, unboxedItem]);
      setUnboxedItem(null);
    }
  };

  const sellItem = (item, index) => {
    if (index !== undefined) {
      setInventory(prev => prev.filter((_, i) => i !== index));
      onSpendMoney(-item.value);
    } else if (unboxedItem) {
      onSpendMoney(-unboxedItem.value);
      setUnboxedItem(null);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setUrl(tab === 'youbet' ? 'youbet.uc' : 'skinmonkey.uc');
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(20,25,45,0.95), rgba(15,18,35,0.98))', border: `2px solid ${pcConnected ? '#60a5fa' : '#333'}`, borderRadius: '10px', padding: '10px', minWidth: '300px', boxShadow: pcConnected ? '0 0 20px rgba(96,165,250,0.2)' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'conic-gradient(#ea4335 0deg 90deg, #fbbc05 90deg 180deg, #34a853 180deg 270deg, #4285f4 270deg 360deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', border: '2px solid #4285f4' }} />
          </div>
          <div>
            <div className="text-blue-400 font-bold text-xs">Uhrome</div>
            <div className={`text-xs ${pcConnected ? 'text-blue-400' : 'text-gray-500'}`}>{pcConnected ? '● ON' : '○ OFF'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Connector direction="input" color="#a855f7" connected={pcConnected} nodeId={id} connectorId="program-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
        </div>
      </div>

      <div className="rounded overflow-hidden" style={{ border: '1px solid #444' }}>
        {/* Browser Chrome */}
        <div className="bg-gray-800 p-1">
          {/* Tabs */}
          <div className="flex gap-1 mb-1">
            <div onClick={() => handleTabClick('youbet')} style={{ background: activeTab === 'youbet' ? '#374151' : '#1f2937', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px 4px 0 0', fontSize: '10px', color: activeTab === 'youbet' ? '#fbbf24' : '#9ca3af' }}>
              🎰 YouBet
            </div>
            <div onClick={() => handleTabClick('skinmonkey')} style={{ background: activeTab === 'skinmonkey' ? '#374151' : '#1f2937', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px 4px 0 0', fontSize: '10px', color: activeTab === 'skinmonkey' ? '#f97316' : '#9ca3af' }}>
              🐵 SkinMonkey
            </div>
          </div>
          {/* URL Bar */}
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 px-2 py-0.5 rounded bg-gray-700 text-gray-400 text-xs font-mono">{url}</div>
          </div>
        </div>
        
        {/* Content Area */}
        {!pcConnected ? (
          <div className="flex items-center justify-center h-40 bg-gray-900 text-gray-500 text-xs">Connect to PC</div>
        ) : activeTab === 'youbet' ? (
          /* YouBet Blackjack */
          <div className="p-2" style={{ background: 'linear-gradient(180deg, #0f4c2a, #052e16)', minHeight: '160px' }}>
            <div className="text-center mb-1">
              <span className="text-yellow-400 font-bold text-xs">🎰 YouBet Blackjack</span>
            </div>
            <div className="mb-1">
              <div className="text-gray-400 text-xs">Dealer {bjGameState !== 'betting' && bjGameState !== 'playing' ? `(${calculateHand(dealerHand)})` : ''}</div>
              <div className="flex gap-1 min-h-[42px]">{dealerHand.map((card, i) => <div key={i}>{renderCard(card, i === 1 && bjGameState === 'playing')}</div>)}</div>
            </div>
            <div className="mb-1">
              <div className="text-gray-400 text-xs">You {playerHand.length > 0 ? `(${calculateHand(playerHand)})` : ''}</div>
              <div className="flex gap-1 min-h-[42px]">{playerHand.map((card, i) => <div key={i}>{renderCard(card)}</div>)}</div>
            </div>
            <div className="text-center text-yellow-300 text-xs font-bold mb-1">{bjMessage}</div>
            {bjGameState === 'betting' && (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-400 text-xs">Bet:</span>
                  <input
                    type="text"
                    value={bet}
                    onChange={(e) => setBet(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 px-2 py-0.5 rounded bg-black/50 border border-yellow-600 text-yellow-400 text-xs text-center font-mono"
                  />
                  <span className="text-yellow-400 text-xs">UC</span>
                </div>
                <button onClick={startBJ} className="w-full py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs">DEAL</button>
              </div>
            )}
            {bjGameState === 'playing' && (
              <div className="flex gap-1">
                <button onClick={hitBJ} className="flex-1 py-1 rounded bg-blue-600 text-white font-bold text-xs">HIT</button>
                <button onClick={() => standBJ()} className="flex-1 py-1 rounded bg-orange-600 text-white font-bold text-xs">STAND</button>
              </div>
            )}
            {bjGameState === 'dealer' && <div className="text-center text-gray-400 text-xs">Dealer playing...</div>}
            {bjGameState === 'result' && (
              <div className="space-y-1">
                {lastWin > 0 && <div className="text-center text-green-400 text-xs">+{lastWin.toFixed(2)} UC</div>}
                <button onClick={newBJ} className="w-full py-1 rounded bg-purple-600 text-white font-bold text-xs">AGAIN</button>
              </div>
            )}
            <div className="mt-1 text-center text-gray-500 text-xs">Balance: <span className="text-yellow-400">{(miningProgress || 0).toFixed(2)}</span> UC</div>
          </div>
        ) : (
          /* SkinMonkey Case Opening */
          <div className="p-2" style={{ background: 'linear-gradient(180deg, #1a1a2e, #16213e)', minHeight: '160px' }}>
            <div className="text-center mb-2">
              <span className="text-orange-400 font-bold text-xs">🐵 SkinMonkey</span>
              <span className="text-gray-400 text-xs ml-1">Case Opening</span>
            </div>
            
            {showInventory ? (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-xs">Inventory ({inventory.length})</span>
                  <button onClick={() => setShowInventory(false)} className="text-xs text-blue-400">← Back</button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {inventory.length === 0 ? (
                    <div className="text-gray-500 text-xs text-center py-4">No items yet</div>
                  ) : inventory.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', borderLeft: `3px solid ${item.color}` }}>
                      <span className="text-xs" style={{ color: item.color }}>{item.name}</span>
                      <button onClick={() => sellItem(item, i)} className="text-xs px-2 py-0.5 rounded bg-green-700 text-green-200">${item.value.toFixed(2)}</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : isUnboxing ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-4xl animate-pulse">📦</div>
                <div className="text-yellow-400 text-xs mt-2">Opening case...</div>
                <div className="w-full h-1 bg-gray-700 rounded mt-2 overflow-hidden">
                  <div className="h-full bg-yellow-500 animate-pulse" style={{ width: '100%', animation: 'pulse 0.5s infinite' }} />
                </div>
              </div>
            ) : unboxedItem ? (
              <div className="flex flex-col items-center py-2">
                <div className="text-xs text-gray-400 mb-1">You unboxed:</div>
                <div className="p-2 rounded text-center mb-2" style={{ background: 'rgba(0,0,0,0.4)', border: `2px solid ${unboxedItem.color}`, boxShadow: `0 0 20px ${unboxedItem.color}40` }}>
                  <div className="text-2xl mb-1">{unboxedItem.rarity === 'gold' ? '🔪' : '🔫'}</div>
                  <div className="font-bold text-xs" style={{ color: unboxedItem.color }}>{unboxedItem.name}</div>
                  <div className="text-green-400 text-xs">${unboxedItem.value.toFixed(2)}</div>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={keepItem} className="flex-1 py-1 rounded bg-blue-600 text-white text-xs font-bold">KEEP</button>
                  <button onClick={() => sellItem(unboxedItem)} className="flex-1 py-1 rounded bg-green-600 text-white text-xs font-bold">SELL ${unboxedItem.value.toFixed(2)}</button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-2">📦</div>
                <div className="text-white text-xs mb-1">Weapon Case</div>
                <div className="text-gray-400 text-xs mb-2">Contains rare weapon skins!</div>
                <button 
                  onClick={openCase} 
                  disabled={money < CASE_PRICE}
                  className="w-full py-2 rounded font-bold text-xs mb-2"
                  style={{ background: money >= CASE_PRICE ? '#f97316' : '#374151', color: money >= CASE_PRICE ? 'white' : '#6b7280', cursor: money >= CASE_PRICE ? 'pointer' : 'not-allowed' }}
                >
                  OPEN CASE - ${CASE_PRICE.toFixed(2)}
                </button>
                <button onClick={() => setShowInventory(true)} className="w-full py-1 rounded bg-gray-700 text-gray-300 text-xs">
                  📦 Inventory ({inventory.length})
                </button>
              </div>
            )}
            <div className="mt-2 text-center text-gray-500 text-xs">Cash: <span className="text-green-400">${(money || 0).toFixed(2)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Program Node (Burners, BitWatcher, and Uhrome Browser)
const ProgramNode = ({ id, type, pcConnected, pcData, miningProgress, money, onSetOverclock, onBetUnitCoin, onSpendMoney, onStartConnection, onEndConnection, onDisconnect }) => {
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const terminalRef = useRef(null);
  const program = COMPONENTS.program[type];
  const target = program?.target; // 'cpu', 'gpu', 'ram', 'display', or 'browser'

  useEffect(() => {
    if (target && target !== 'display' && target !== 'browser') {
      setTerminalHistory([
        { type: 'system', text: `${program?.name} v1.0 initialized` },
        { type: 'system', text: 'Type "oc help" for commands' }
      ]);
    }
  }, [type, target, program]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const getTargetName = () => {
    if (target === 'cpu') return 'CPU';
    if (target === 'gpu') return 'GPU';
    if (target === 'ram') return 'RAM';
    return 'UNKNOWN';
  };

  const getCurrentOC = () => {
    if (!pcData) return 0;
    if (target === 'cpu') return pcData.cpuOC || 0;
    if (target === 'gpu') return pcData.gpuOC || 0;
    if (target === 'ram') return pcData.ramOC || 0;
    return 0;
  };

  const getComponentInfo = () => {
    if (!pcData) return null;
    if (target === 'cpu' && pcData.cpu) return COMPONENTS.cpu[pcData.cpu];
    if (target === 'gpu' && pcData.gpu) return COMPONENTS.gpu[pcData.gpu];
    if (target === 'ram') {
      const totalRam = pcData.ram?.reduce((sum, r) => r ? sum + COMPONENTS.ram[r].size : sum, 0) || 0;
      return { name: `${totalRam}GB Total`, size: totalRam };
    }
    return null;
  };

  const executeCommand = (cmd) => {
    const parts = cmd.toLowerCase().trim().split(/\s+/);
    const newHistory = [...terminalHistory, { type: 'input', text: `> ${cmd}` }];

    if (parts[0] === 'oc') {
      if (parts[1] === 'help') {
        newHistory.push({ type: 'output', text: '=== OC COMMANDS ===' });
        newHistory.push({ type: 'output', text: `oc ${target} get    - Get current OC %` });
        newHistory.push({ type: 'output', text: `oc ${target} burn X - Set OC to X%` });
        newHistory.push({ type: 'output', text: `oc ${target} reset  - Reset OC to 0%` });
        newHistory.push({ type: 'output', text: `oc ${target} info   - Show component info` });
        newHistory.push({ type: 'output', text: `oc status          - Show PC status` });
        newHistory.push({ type: 'output', text: 'clear              - Clear terminal' });
      } else if (parts[1] === target) {
        if (!pcConnected || !pcData) {
          newHistory.push({ type: 'error', text: 'ERROR: No PC connected' });
        } else if (pcData.isOverheated) {
          newHistory.push({ type: 'error', text: 'ERROR: PC overheated - cannot modify OC' });
        } else if (parts[2] === 'get') {
          newHistory.push({ type: 'output', text: `${getTargetName()} Overclock: ${getCurrentOC()}%` });
        } else if (parts[2] === 'burn') {
          const value = parseInt(parts[3]);
          if (isNaN(value) || value < 0 || value > 50) {
            newHistory.push({ type: 'error', text: 'ERROR: Value must be 0-50' });
          } else {
            onSetOverclock(pcData.id, target, value);
            newHistory.push({ type: 'success', text: `${getTargetName()} OC set to ${value}%` });
            newHistory.push({ type: 'warning', text: '⚠ Warning: Higher OC = Higher temps' });
          }
        } else if (parts[2] === 'reset') {
          onSetOverclock(pcData.id, target, 0);
          newHistory.push({ type: 'success', text: `${getTargetName()} OC reset to 0%` });
        } else if (parts[2] === 'info') {
          const info = getComponentInfo();
          if (info) {
            newHistory.push({ type: 'output', text: `${getTargetName()}: ${info.name}` });
            if (info.cores) newHistory.push({ type: 'output', text: `Cores: ${info.cores}` });
            if (info.speed) newHistory.push({ type: 'output', text: `Speed: ${info.speed}GHz` });
            if (info.vram) newHistory.push({ type: 'output', text: `VRAM: ${info.vram}GB` });
            if (info.hashRate) newHistory.push({ type: 'output', text: `Hash Rate: ${info.hashRate}` });
            if (info.temp) newHistory.push({ type: 'output', text: `Base Temp: ${info.temp}°C` });
            newHistory.push({ type: 'output', text: `Current OC: ${getCurrentOC()}%` });
          } else {
            newHistory.push({ type: 'error', text: `No ${getTargetName()} installed` });
          }
        } else {
          newHistory.push({ type: 'error', text: `Unknown command. Try: oc ${target} get/burn/reset/info` });
        }
      } else if (parts[1] === 'status') {
        if (!pcConnected || !pcData) {
          newHistory.push({ type: 'error', text: 'ERROR: No PC connected' });
        } else {
          newHistory.push({ type: 'output', text: '=== PC STATUS ===' });
          newHistory.push({ type: 'output', text: `Temp: ${pcData.currentTemp}°C` });
          newHistory.push({ type: 'output', text: `CPU OC: ${pcData.cpuOC || 0}%` });
          newHistory.push({ type: 'output', text: `GPU OC: ${pcData.gpuOC || 0}%` });
          newHistory.push({ type: 'output', text: `RAM OC: ${pcData.ramOC || 0}%` });
          newHistory.push({ type: 'output', text: `Status: ${pcData.isOverheated ? '🔥 OVERHEATED' : '✓ Normal'}` });
        }
      } else {
        newHistory.push({ type: 'error', text: `This is ${program.name}. Use: oc ${target} <cmd>` });
      }
    } else if (parts[0] === 'clear') {
      setTerminalHistory([{ type: 'system', text: `${program.name} v1.0` }]);
      setInputValue('');
      return;
    } else if (parts[0] === 'help') {
      newHistory.push({ type: 'output', text: 'Type "oc help" for overclock commands' });
    } else if (cmd.trim() !== '') {
      newHistory.push({ type: 'error', text: `Unknown command: ${parts[0]}` });
    }

    setTerminalHistory(newHistory);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      executeCommand(inputValue);
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'input': return '#888';
      case 'output': return '#4ade80';
      case 'error': return '#f87171';
      case 'warning': return '#fbbf24';
      case 'success': return '#22d3ee';
      case 'system': return '#a78bfa';
      default: return '#4ade80';
    }
  };

  const borderColor = target === 'cpu' ? '#00d4ff' : target === 'gpu' ? '#ff6b00' : target === 'ram' ? '#b44aff' : '#22c55e';

  // BitWatcher rendering
  if (target === 'display') {
    const progress = miningProgress || 0;
    const gridSize = 16;
    const totalCells = gridSize * gridSize;
    const filledCells = Math.floor((progress % 1) * totalCells);
    const completedCoins = Math.floor(progress);

    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(15,25,15,0.95), rgba(10,18,10,0.98))', border: `2px solid ${pcConnected ? '#22c55e' : '#333'}`, borderRadius: '10px', padding: '12px', minWidth: '220px', boxShadow: pcConnected ? `0 0 20px rgba(34,197,94,0.2)` : 'none' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <div className="text-green-400 font-bold text-xs">{program.name}</div>
              <div className={`text-xs ${pcConnected ? 'text-green-500' : 'text-gray-500'}`}>{pcConnected ? '● LINKED' : '○ NO PC'}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
          <Connector direction="input" color="#a855f7" connected={pcConnected} nodeId={id} connectorId="program-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
          <span className="text-purple-400 text-xs">PC IN</span>
        </div>

        {/* Mining Grid */}
        <div className="p-2 rounded bg-black" style={{ border: '1px solid #333' }}>
          <div className="text-green-400 text-xs font-mono mb-2 text-center">
            ⛏️ Mining Progress
          </div>
          <div 
            className="grid gap-px mx-auto"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              width: 'fit-content'
            }}
          >
            {[...Array(totalCells)].map((_, i) => {
              const isFilled = i < filledCells;
              const isPartial = i === filledCells;
              return (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: isFilled ? '#22c55e' : isPartial ? '#84cc16' : '#3f1515',
                    borderRadius: '1px',
                    transition: 'background-color 0.3s ease',
                    boxShadow: isFilled ? '0 0 3px #22c55e' : 'none',
                  }}
                />
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <div className="text-yellow-400 font-mono text-sm">🪙 {completedCoins}</div>
            <div className="text-gray-500 text-xs">{((progress % 1) * 100).toFixed(1)}% to next</div>
          </div>
          {pcData && (
            <div className="mt-2 pt-2 border-t border-gray-800 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>UGS:</span>
                <span className="text-green-400">{(calculateUGS(pcData.cpu, pcData.gpu, pcData.ram, pcData.cpuOC || 0, pcData.gpuOC || 0, pcData.ramOC || 0) / 60).toFixed(6)}/s</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Uhrome Browser - use separate component
  if (target === 'browser') {
    return (
      <UhromeBrowser
        id={id}
        pcConnected={pcConnected}
        miningProgress={miningProgress}
        money={money}
        onBetUnitCoin={onBetUnitCoin}
        onSpendMoney={onSpendMoney}
        onStartConnection={onStartConnection}
        onEndConnection={onEndConnection}
        onDisconnect={onDisconnect}
      />
    );
  }

  // Burner terminal rendering
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(15,20,15,0.95), rgba(10,15,10,0.98))', border: `2px solid ${pcConnected ? borderColor : '#333'}`, borderRadius: '10px', padding: '12px', minWidth: '260px', boxShadow: pcConnected ? `0 0 20px ${borderColor}30` : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{target === 'cpu' ? '🔷' : target === 'gpu' ? '🔶' : '🟣'}</span>
          <div>
            <div style={{ color: borderColor }} className="font-bold text-xs">{program.name}</div>
            <div className={`text-xs ${pcConnected ? 'text-green-500' : 'text-gray-500'}`}>{pcConnected ? '● LINKED' : '○ NO PC'}</div>
          </div>
        </div>
        <div className="text-xs text-gray-500">{program.ramReq}GB RAM</div>
      </div>
      
      <div className="flex items-center gap-2 mb-2 p-1.5 rounded bg-black/40">
        <Connector direction="input" color="#a855f7" connected={pcConnected} nodeId={id} connectorId="program-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
        <span className="text-purple-400 text-xs">PC IN</span>
      </div>

      {/* Terminal */}
      <div className="rounded bg-black font-mono text-xs" style={{ border: '1px solid #333' }}>
        <div 
          ref={terminalRef}
          className="p-2 overflow-y-auto"
          style={{ height: '120px', scrollbarWidth: 'thin' }}
        >
          {terminalHistory.map((line, i) => (
            <div key={i} style={{ color: getTextColor(line.type) }} className="leading-tight">
              {line.text}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 p-1 flex items-center">
          <span className="text-green-500 mr-1">{'>'}</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder={`oc ${target} ...`}
            className="flex-1 bg-transparent text-green-400 text-xs focus:outline-none"
            style={{ caretColor: '#22c55e' }}
          />
        </div>
      </div>
    </div>
  );
};

// Interface Node
function InterfaceNode({ id, connected, pcData, hasMinerConnected, programData, unitCoin, unitCoinPrice, onBuy, onSell, onSellAll, money, priceHistory, onStartConnection, onEndConnection, onDisconnect }) {
  const [buyAmount, setBuyAmount] = useState('1');
  const [sellAmount, setSellAmount] = useState('1');
  const os = pcData ? pcData.os : null;
  const osData = os ? COMPONENTS.os[os] : null;
  
  const canTrade = (connected && os) || (connected && hasMinerConnected);
  const displayName = os ? osData.name : (hasMinerConnected ? 'Miner Direct Link' : null);
  
  const prevPrice = priceHistory.length >= 2 ? priceHistory[priceHistory.length - 2] : unitCoinPrice;
  const isUp = unitCoinPrice >= prevPrice;

  const handleBuy = function() {
    const amount = parseFloat(buyAmount) || 0;
    if (amount > 0 && money >= amount * unitCoinPrice) {
      onBuy(amount);
    }
  };

  const handleSell = function() {
    const amount = parseFloat(sellAmount) || 0;
    if (amount > 0 && unitCoin >= amount) {
      onSell(amount);
    }
  };
  
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(20,25,40,0.95), rgba(10,15,25,0.98))', border: `2px solid ${connected ? '#3b82f6' : '#333'}`, borderRadius: '10px', padding: '12px', minWidth: '220px', boxShadow: connected ? '0 0 20px rgba(59,130,246,0.2)' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🖵</span>
          <div>
            <div className="text-white font-bold text-xs">Interface</div>
            <div className={`text-xs ${connected ? 'text-blue-400' : 'text-gray-500'}`}>{connected ? '● SIGNAL' : '○ NONE'}</div>
          </div>
        </div>
        <Connector direction="input" color="#3b82f6" connected={connected} nodeId={id} connectorId="display-in" onStartConnection={onStartConnection} onEndConnection={onEndConnection} onDisconnect={onDisconnect} />
      </div>

      <div className="p-2 rounded-lg" style={{ background: canTrade ? '#0a1628' : '#0a0a0a', border: '1px solid #1e3a5f', minHeight: '120px' }}>
        {!connected ? (
          <div className="flex items-center justify-center h-24 text-gray-600 text-xs">No Signal</div>
        ) : !canTrade ? (
          <div className="flex items-center justify-center h-24 text-gray-600 text-xs">No OS on PC</div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-center text-green-400 text-xs font-mono">═ {displayName} ═</div>
            <div className="bg-black/50 p-1.5 rounded">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">UC</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono text-yellow-400">${unitCoinPrice.toFixed(2)}</span>
                  <span className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '▲' : '▼'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Hold:</span>
              <span className="text-cyan-400 font-mono">{unitCoin.toFixed(6)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Cash:</span>
              <span className="text-green-400 font-mono">${money.toFixed(2)}</span>
            </div>
            
            <div className="flex gap-1 items-center">
              <button 
                onClick={handleBuy} 
                disabled={money < (parseFloat(buyAmount) || 0) * unitCoinPrice}
                className="py-1 px-2 rounded text-xs font-bold" 
                style={{ 
                  background: money >= (parseFloat(buyAmount) || 0) * unitCoinPrice ? '#166534' : '#1f2937', 
                  color: money >= (parseFloat(buyAmount) || 0) * unitCoinPrice ? '#4ade80' : '#6b7280', 
                  cursor: money >= (parseFloat(buyAmount) || 0) * unitCoinPrice ? 'pointer' : 'not-allowed' 
                }}
              >
                BUY
              </button>
              <input
                type="text"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0.5 rounded bg-black/50 border border-green-800 text-green-400 text-xs text-center font-mono"
                style={{ width: '50px' }}
              />
            </div>
            
            <div className="flex gap-1 items-center">
              <button 
                onClick={handleSell} 
                disabled={unitCoin < (parseFloat(sellAmount) || 0)}
                className="py-1 px-2 rounded text-xs font-bold" 
                style={{ 
                  background: unitCoin >= (parseFloat(sellAmount) || 0) ? '#991b1b' : '#1f2937', 
                  color: unitCoin >= (parseFloat(sellAmount) || 0) ? '#f87171' : '#6b7280', 
                  cursor: unitCoin >= (parseFloat(sellAmount) || 0) ? 'pointer' : 'not-allowed' 
                }}
              >
                SELL
              </button>
              <input
                type="text"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0.5 rounded bg-black/50 border border-red-800 text-red-400 text-xs text-center font-mono"
                style={{ width: '50px' }}
              />
              <button 
                onClick={onSellAll} 
                disabled={unitCoin < 0.01}
                className="py-1 px-1.5 rounded text-xs font-bold" 
                style={{ 
                  background: unitCoin >= 0.01 ? '#7c2d12' : '#1f2937', 
                  color: unitCoin >= 0.01 ? '#fdba74' : '#6b7280', 
                  cursor: unitCoin >= 0.01 ? 'pointer' : 'not-allowed' 
                }}
              >
                ALL
              </button>
            </div>
          </div>
        )}
      </div>

      {programData && connected && (
        <div className="mt-2 p-2 rounded-lg" style={{ background: '#0a1208', border: '1px solid #22c55e40' }}>
          <div className="text-green-400 text-xs font-mono mb-1">═ {COMPONENTS.program[programData.type]?.name} ═</div>
          <div className="text-xs space-y-0.5">
            <div className="text-gray-400">CPU: <span className="text-cyan-400">{programData.pcData?.cpu ? COMPONENTS.cpu[programData.pcData.cpu]?.name : 'N/A'}</span></div>
            <div className="text-gray-400">GPU: <span className="text-orange-400">{programData.pcData?.gpu ? COMPONENTS.gpu[programData.pcData.gpu]?.name : 'N/A'}</span></div>
            <div className="text-gray-400">Temp: <span style={{ color: getTempColor(programData.pcData?.currentTemp || 25) }}>{programData.pcData?.currentTemp || 25}°C</span></div>
            <div className="text-gray-400">OC: <span className="text-cyan-400">{programData.pcData?.cpuOC || 0}</span>/<span className="text-orange-400">{programData.pcData?.gpuOC || 0}</span>/<span className="text-purple-400">{programData.pcData?.ramOC || 0}</span>%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Connection Line
const ConnectionLine = ({ startPos, endPos, color, isDrawing }) => {
  if (!startPos) return null;
  const end = endPos || startPos;
  const midX = (startPos.x + end.x) / 2;
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
      <defs><filter id="glow-line"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d={`M ${startPos.x} ${startPos.y} C ${midX} ${startPos.y}, ${midX} ${end.y}, ${end.x} ${end.y}`} stroke={color} strokeWidth="3" fill="none" filter="url(#glow-line)" strokeDasharray={isDrawing ? "5,5" : "none"} opacity={isDrawing ? 0.6 : 0.9} />
      {!isDrawing && <circle r="4" fill={color} filter="url(#glow-line)"><animateMotion dur="1.5s" repeatCount="indefinite" path={`M ${startPos.x} ${startPos.y} C ${midX} ${startPos.y}, ${midX} ${end.y}, ${end.x} ${end.y}`} /></circle>}
    </svg>
  );
};

// Shop Item
const ShopItem = ({ id, type, name, specs, price, owned, onBuy, alwaysBuyable }) => {
  const colors = { cpu: '#00d4ff', gpu: '#ff6b00', ram: '#b44aff', os: '#22c55e', node: '#a855f7', cooling: '#06b6d4', program: '#22c55e', transformer: '#ff9500' };
  const canBuy = alwaysBuyable || !owned;
  
  return (
    <div
      draggable={owned && !alwaysBuyable}
      onDragStart={(e) => { if (owned) { e.dataTransfer.setData('itemId', id); e.dataTransfer.setData('itemType', type); }}}
      className="p-1.5 rounded transition-all"
      style={{ background: owned && !alwaysBuyable ? `${colors[type]}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${owned && !alwaysBuyable ? colors[type] + '40' : 'rgba(255,255,255,0.08)'}`, cursor: owned && !alwaysBuyable ? 'grab' : 'default', opacity: owned || alwaysBuyable ? 1 : 0.5 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: colors[type] }}>{name}</span>
        {canBuy && <button onClick={() => onBuy(id, type, price)} className="px-1.5 py-0.5 rounded text-xs bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-800/50">${price}</button>}
        {owned && !alwaysBuyable && <span className="text-gray-600 text-xs">⋮⋮</span>}
      </div>
      <div className="text-xs text-gray-500">{specs}</div>
    </div>
  );
};

// Save version - increment this when save format changes
const SAVE_VERSION = 1;

// Migration functions to update old saves to new format
const migrations = {
  // Example: migrate from version 0 (no version) to version 1
  // 0: (save) => {
  //   // Add new fields, rename things, etc.
  //   save.gameState.newField = 'default';
  //   return save;
  // },
  // 1: (save) => {
  //   // Migrate from v1 to v2
  //   return save;
  // },
};

// Run all migrations from oldVersion to current version
const migrateSave = (save, fromVersion) => {
  let currentSave = save;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    if (migrations[v]) {
      console.log(`Migrating save from v${v} to v${v + 1}`);
      currentSave = migrations[v](currentSave);
    }
  }
  currentSave.version = SAVE_VERSION;
  return currentSave;
};

// Main Game
export default function MiningGame() {
  // Load saved state from localStorage or use defaults
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem('unitcoin-save');
      if (saved) {
        let parsed = JSON.parse(saved);
        const saveVersion = parsed.version || 0;
        
        // Check if migration is needed
        if (saveVersion < SAVE_VERSION) {
          console.log(`Save version ${saveVersion} is outdated, migrating to v${SAVE_VERSION}`);
          parsed = migrateSave(parsed, saveVersion);
          // Save the migrated data
          localStorage.setItem('unitcoin-save', JSON.stringify(parsed));
        }
        
        return parsed;
      }
    } catch (e) {
      console.log('Failed to load save:', e);
    }
    return null;
  };

  const savedState = loadSavedState();
  
  const [gameState, setGameState] = useState(savedState?.gameState || INITIAL_STATE);
  const [nodes, setNodes] = useState(savedState?.nodes || {
    'power-grid': { type: 'power-grid', position: { x: 30, y: 40 } },
    'pc-1': { type: 'pc', position: { x: 240, y: 30 }, cpu: 'cpu-1', gpu: 'gpu-8', ram: ['ram-8', 'ram-8', null, null], cooling: null, os: 'trader-os', cpuOC: 0, gpuOC: 0, ramOC: 0, isOverheated: false, currentTemp: 25 },
    'interface-1': { type: 'interface', position: { x: 580, y: 40 } },
  });
  const [connections, setConnections] = useState(savedState?.connections || []);
  const [drawingConnection, setDrawingConnection] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [inventory, setInventory] = useState(savedState?.inventory || { 'cpu-1': true, 'gpu-8': true, 'ram-8': true, 'trader-os': true });
  const [shopOpen, setShopOpen] = useState(true);
  const [nodeCounter, setNodeCounter] = useState(savedState?.nodeCounter || 2);
  const [cheatTerminalOpen, setCheatTerminalOpen] = useState(false);
  const [cheatInput, setCheatInput] = useState('');
  
  const workspaceRef = useRef(null);
  const scale = CANVAS_SCALES[gameState.canvasLevel];

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    const saveData = {
      version: SAVE_VERSION,
      gameState,
      nodes,
      connections,
      inventory,
      nodeCounter,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem('unitcoin-save', JSON.stringify(saveData));
    } catch (e) {
      console.log('Failed to save:', e);
    }
  }, [gameState, nodes, connections, inventory, nodeCounter]);

  const [resetConfirm, setResetConfirm] = useState(false);

  // Reset game function
  const resetGame = () => {
    if (resetConfirm) {
      localStorage.removeItem('unitcoin-save');
      window.location.reload();
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000); // Reset after 3 seconds if not clicked
    }
  };

  // Handle cheat code
  const handleCheatSubmit = () => {
    if (cheatInput.toUpperCase() === 'MOTHERLODE') {
      setGameState(prev => ({ ...prev, money: prev.money + 100000 }));
      setCheatInput('');
      setCheatTerminalOpen(false);
    } else {
      setCheatInput('');
    }
  };

  const handleCheatKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleCheatSubmit();
    }
  };

  // Power check
  const hasPower = useCallback((nodeId, visited = new Set()) => {
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    
    const conn = connections.find(c => c.to === `${nodeId}:power-in`);
    if (!conn) return false;
    const [fromNode] = conn.from.split(':');
    if (fromNode === 'power-grid') return true;
    const fromNodeData = nodes[fromNode];
    if (fromNodeData?.type === 'power-strip' || fromNodeData?.type === 'transformer') {
      return hasPower(fromNode, visited);
    }
    return false;
  }, [connections, nodes]);

  const hasDisplay = useCallback((nodeId) => connections.some(c => c.from === `${nodeId}:display-out`), [connections]);

  // Get PC data for program nodes
  const getPCForProgram = useCallback((programId) => {
    const conn = connections.find(c => c.to === `${programId}:program-in`);
    if (!conn) return null;
    const [pcId] = conn.from.split(':');
    const pc = nodes[pcId];
    if (pc?.type === 'pc') return { ...pc, id: pcId };
    return null;
  }, [connections, nodes]);

  // Get PC data for interface (handles direct connection or through interface hub)
  const getPCDataForInterface = useCallback((interfaceId) => {
    const displayConn = connections.find(c => c.to === `${interfaceId}:display-in`);
    if (!displayConn) return null;
    
    const [sourceId] = displayConn.from.split(':');
    const sourceNode = nodes[sourceId];
    
    // Direct PC connection
    if (sourceNode?.type === 'pc') {
      return { ...sourceNode, id: sourceId };
    }
    
    // If connected through Interface Hub, find the first connected PC
    if (sourceNode?.type === 'interface-hub') {
      for (let i = 0; i < 4; i++) {
        const hubConn = connections.find(c => c.to === `${sourceId}:display-in-${i}`);
        if (hubConn) {
          const [deviceId] = hubConn.from.split(':');
          const deviceNode = nodes[deviceId];
          if (deviceNode?.type === 'pc') {
            return { ...deviceNode, id: deviceId };
          }
        }
      }
    }
    
    // Miner or other - return null (no OS needed for display)
    return null;
  }, [connections, nodes]);

  // Check if interface has any miner connected (directly or through hub)
  const hasMinerConnected = useCallback((interfaceId) => {
    const displayConn = connections.find(c => c.to === `${interfaceId}:display-in`);
    if (!displayConn) return false;
    
    const [sourceId] = displayConn.from.split(':');
    const sourceNode = nodes[sourceId];
    
    // Direct miner connection
    if (sourceNode?.type === 'miner') {
      return true;
    }
    
    // If connected through Interface Hub, check for any miners
    if (sourceNode?.type === 'interface-hub') {
      for (let i = 0; i < 4; i++) {
        const hubConn = connections.find(c => c.to === `${sourceId}:display-in-${i}`);
        if (hubConn) {
          const [deviceId] = hubConn.from.split(':');
          const deviceNode = nodes[deviceId];
          if (deviceNode?.type === 'miner') {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [connections, nodes]);

  // Get program data for interface (finds programs connected to PC that's connected to this interface)
  const getProgramDataForInterface = useCallback((interfaceId) => {
    // Find which PC/miner is connected to this interface
    const displayConn = connections.find(c => c.to === `${interfaceId}:display-in`);
    if (!displayConn) return null;
    
    const [sourceId] = displayConn.from.split(':');
    const sourceNode = nodes[sourceId];
    
    if (sourceNode?.type !== 'pc') return null;
    
    // Find all programs connected to this PC (check all program slots)
    const programs = [];
    for (let i = 0; i < 4; i++) {
      const programConn = connections.find(c => c.from === `${sourceId}:program-out-${i}`);
      if (programConn) {
        const [programId] = programConn.to.split(':');
        const programNode = nodes[programId];
        if (programNode?.type === 'program') {
          programs.push({
            type: programNode.programType,
            pcData: sourceNode
          });
        }
      }
    }
    
    return programs.length > 0 ? programs[0] : null; // Return first program for now
  }, [connections, nodes]);

  // Calculate total wattage
  const totalWattage = Object.entries(nodes).reduce((sum, [id, node]) => {
    if (node.type === 'transformer' && hasPower(id)) {
      return sum + TRANSFORMERS[node.transformerType].wattage;
    }
    return sum;
  }, 1200); // Base 1200W from home grid

  // Price fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => {
        const change = (Math.random() - 0.5) * 0.2;
        const newPrice = Math.max(0.1, prev.unitCoinPrice + change);
        return { ...prev, unitCoinPrice: newPrice, priceHistory: [...prev.priceHistory.slice(-20), newPrice] };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Temperature and mining tick
  useEffect(() => {
    const interval = setInterval(() => {
      let totalUGS = 0;
      let transformerFees = 0;

      setNodes(prev => {
        const updated = { ...prev };
        
        Object.entries(updated).forEach(([id, node]) => {
          if (node.type === 'pc') {
            const powered = hasPower(id);
            let newTemp = calculateTemp(node.cpu, node.gpu, node.ram, powered, node.cooling, node.cpuOC || 0, node.gpuOC || 0, node.ramOC || 0);
            let isOverheated = node.isOverheated;
            let cpuOC = node.cpuOC || 0;
            let gpuOC = node.gpuOC || 0;
            let ramOC = node.ramOC || 0;

            if (isOverheated) {
              newTemp = Math.max(25, node.currentTemp - 0.5);
              if (newTemp <= 50) {
                isOverheated = false;
              }
            } else if (newTemp >= OVERHEAT_THRESHOLD) {
              isOverheated = true;
              cpuOC = 0;
              gpuOC = 0;
              ramOC = 0;
            }

            if (powered && !isOverheated) {
              totalUGS += calculateUGS(node.cpu, node.gpu, node.ram, cpuOC, gpuOC, ramOC);
            }

            updated[id] = { ...node, currentTemp: Math.round(newTemp), isOverheated, cpuOC, gpuOC, ramOC };
          } else if (node.type === 'miner' && hasPower(id)) {
            totalUGS += 1;
          } else if (node.type === 'transformer' && hasPower(id)) {
            transformerFees += TRANSFORMERS[node.transformerType].tickFee;
          }
        });

        return updated;
      });

      if (totalUGS > 0 || transformerFees > 0) {
        setGameState(prev => ({
          ...prev,
          unitCoin: prev.unitCoin + (totalUGS / 60),
          money: Math.max(0, prev.money - transformerFees),
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasPower]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (workspaceRef.current && drawingConnection) {
        const rect = workspaceRef.current.getBoundingClientRect();
        setMousePos({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
      }
    };
    const handleMouseUp = () => setDrawingConnection(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [drawingConnection, scale]);

  const handlePositionChange = useCallback((id, newPos) => {
    setNodes(prev => ({ ...prev, [id]: { ...prev[id], position: newPos } }));
  }, []);

  const getConnectorPosition = useCallback((nodeId, connectorId) => {
    const node = nodes[nodeId];
    if (!node) return null;
    const pos = node.position;
    
    // Dynamic offsets for PC program slots
    if (node.type === 'pc' && connectorId.startsWith('program-out-')) {
      const slotIndex = parseInt(connectorId.split('-')[2]);
      return { x: pos.x + 45 + slotIndex * 50, y: pos.y + 320 };
    }
    
    const offsets = {
      'power-grid': { 'power-out': { x: 150, y: 62 } },
      'transformer': { 'power-in': { x: 18, y: 58 }, 'power-out': { x: 168, y: 100 } },
      'power-strip': { 'power-in': { x: 18, y: 55 }, 'power-out-0': { x: 78, y: 100 }, 'power-out-1': { x: 168, y: 100 }, 'power-out-2': { x: 78, y: 128 }, 'power-out-3': { x: 168, y: 128 } },
      'pc': { 'power-in': { x: 18, y: 68 }, 'display-out': { x: 248, y: 260 } },
      'miner': { 'power-in': { x: 18, y: 55 }, 'display-out': { x: 158, y: 98 } },
      'interface-hub': { 'display-in-0': { x: 18, y: 68 }, 'display-in-1': { x: 108, y: 68 }, 'display-in-2': { x: 18, y: 96 }, 'display-in-3': { x: 108, y: 96 }, 'signal-out': { x: 188, y: 130 } },
      'interface': { 'display-in': { x: 208, y: 28 } },
      'program': { 'program-in': { x: 18, y: 55 } },
    };
    const nodeOffsets = offsets[node.type] || {};
    const offset = nodeOffsets[connectorId] || { x: 0, y: 0 };
    return { x: pos.x + offset.x, y: pos.y + offset.y };
  }, [nodes]);

  const handleStartConnection = (nodeId, connectorId, color) => {
    const pos = getConnectorPosition(nodeId, connectorId);
    setDrawingConnection({ from: `${nodeId}:${connectorId}`, startPos: pos, color });
  };

  const handleEndConnection = (nodeId, connectorId) => {
    if (!drawingConnection) return;
    const [fromNode, fromConn] = drawingConnection.from.split(':');
    const fromType = nodes[fromNode]?.type;
    const toType = nodes[nodeId]?.type;

    let valid = false;
    // Power connections
    if (fromConn === 'power-out' && connectorId === 'power-in') {
      if (fromType === 'power-grid' && ['pc', 'power-strip', 'miner', 'transformer'].includes(toType)) valid = true;
      if (fromType === 'transformer' && ['pc', 'power-strip', 'miner'].includes(toType)) valid = true;
      if (fromType === 'power-strip' && ['pc', 'miner'].includes(toType)) valid = true;
    }
    if (fromConn.startsWith('power-out-') && connectorId === 'power-in') {
      if (fromType === 'power-strip' && ['pc', 'miner'].includes(toType)) valid = true;
    }
    // Display connections (to interface or interface-hub)
    if (fromConn === 'display-out' && connectorId === 'display-in') {
      if (['pc', 'miner'].includes(fromType) && toType === 'interface') valid = true;
    }
    if (fromConn === 'display-out' && connectorId.startsWith('display-in-')) {
      if (['pc', 'miner'].includes(fromType) && toType === 'interface-hub') valid = true;
    }
    // Interface Hub signal out to Interface display in
    if (fromConn === 'signal-out' && connectorId === 'display-in') {
      if (fromType === 'interface-hub' && toType === 'interface') valid = true;
    }
    // Program connections (PC program-out-X to Program node program-in)
    if (fromConn.startsWith('program-out') && connectorId === 'program-in') {
      if (fromType === 'pc' && toType === 'program') valid = true;
    }

    if (valid) {
      setConnections(prev => [...prev.filter(c => c.to !== `${nodeId}:${connectorId}`), { from: drawingConnection.from, to: `${nodeId}:${connectorId}`, color: drawingConnection.color }]);
    }
    setDrawingConnection(null);
  };

  const handleDisconnect = (nodeId, connectorId) => {
    setConnections(prev => prev.filter(c => c.to !== `${nodeId}:${connectorId}`));
  };

  const handleSlotDrop = (nodeId, type, id, index) => {
    setNodes(prev => {
      const node = { ...prev[nodeId] };
      if (type === 'ram' && typeof index === 'number') {
        const newRam = [...node.ram];
        newRam[index] = id;
        node.ram = newRam;
      } else {
        node[type] = id;
      }
      return { ...prev, [nodeId]: node };
    });
  };

  const handleSetOverclock = (pcId, target, value) => {
    setNodes(prev => {
      const node = prev[pcId];
      if (!node) return prev;
      const key = target === 'cpu' ? 'cpuOC' : target === 'gpu' ? 'gpuOC' : 'ramOC';
      return { ...prev, [pcId]: { ...node, [key]: value } };
    });
  };

  const handleBuy = (coins) => {
    const cost = coins * gameState.unitCoinPrice;
    if (gameState.money >= cost) setGameState(prev => ({ ...prev, money: prev.money - cost, unitCoin: prev.unitCoin + coins }));
  };

  const handleSell = (coins) => {
    if (gameState.unitCoin >= coins) setGameState(prev => ({ ...prev, money: prev.money + coins * prev.unitCoinPrice, unitCoin: prev.unitCoin - coins }));
  };

  const handleSellAll = () => {
    if (gameState.unitCoin >= 0.01) {
      setGameState(prev => ({ ...prev, money: prev.money + prev.unitCoin * prev.unitCoinPrice, unitCoin: 0 }));
    }
  };

  const handleShopBuy = (id, type, price) => {
    if (gameState.money >= price) {
      setGameState(prev => ({ ...prev, money: prev.money - price }));
      
      if (type === 'node' || type === 'transformer' || type === 'program') {
        const newId = `${id}-${nodeCounter}`;
        setNodeCounter(prev => prev + 1);
        
        const nodeTypes = {
          'power-strip': { type: 'power-strip', position: { x: 50 + Math.random() * 100, y: 200 + Math.random() * 100 } },
          'miner': { type: 'miner', position: { x: 300 + Math.random() * 100, y: 250 + Math.random() * 100 } },
          'interface-hub': { type: 'interface-hub', position: { x: 500 + Math.random() * 100, y: 150 + Math.random() * 100 } },
          'transformer-small': { type: 'transformer', transformerType: 'transformer-small', position: { x: 100 + Math.random() * 100, y: 150 + Math.random() * 100 } },
          'transformer-medium': { type: 'transformer', transformerType: 'transformer-medium', position: { x: 100 + Math.random() * 100, y: 150 + Math.random() * 100 } },
          'transformer-large': { type: 'transformer', transformerType: 'transformer-large', position: { x: 100 + Math.random() * 100, y: 150 + Math.random() * 100 } },
          'cpuburner': { type: 'program', programType: 'cpuburner', position: { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 } },
          'gpuburner': { type: 'program', programType: 'gpuburner', position: { x: 420 + Math.random() * 100, y: 220 + Math.random() * 100 } },
          'ramburner': { type: 'program', programType: 'ramburner', position: { x: 440 + Math.random() * 100, y: 240 + Math.random() * 100 } },
          'bitwatcher': { type: 'program', programType: 'bitwatcher', position: { x: 460 + Math.random() * 100, y: 260 + Math.random() * 100 } },
          'uhrome': { type: 'program', programType: 'uhrome', position: { x: 480 + Math.random() * 100, y: 280 + Math.random() * 100 } },
        };
        
        setNodes(prev => ({ ...prev, [newId]: nodeTypes[id] }));
      } else {
        setInventory(prev => ({ ...prev, [id]: true }));
      }
    }
  };

  const handleBuyCanvas = (level) => {
    const price = CANVAS_PRICES[level];
    if (gameState.money >= price && gameState.canvasLevel < level) {
      setGameState(prev => ({ ...prev, money: prev.money - price, canvasLevel: level }));
    }
  };

  // Calculate totals
  const totalUGS = Object.entries(nodes).reduce((sum, [id, node]) => {
    if (node.type === 'pc' && hasPower(id) && !node.isOverheated) return sum + calculateUGS(node.cpu, node.gpu, node.ram, node.cpuOC || 0, node.gpuOC || 0, node.ramOC || 0);
    if (node.type === 'miner' && hasPower(id)) return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="min-h-screen p-3" style={{ background: 'linear-gradient(135deg, #080b12, #0d1220)' }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer select-none" 
              style={{ background: 'linear-gradient(135deg, rgba(255,204,0,0.2), rgba(255,136,0,0.2))', border: '1px solid rgba(255,204,0,0.3)' }}
              onDoubleClick={() => setCheatTerminalOpen(true)}
              title="Double-click for terminal"
            >⛏️</div>
            <div>
              <h1 className="text-base font-bold text-white">UnitCoin Miner</h1>
              <div className="text-xs text-gray-500">UGS: <span className="text-cyan-400">{(totalUGS / 60).toFixed(6)}/s</span> • Zoom: <span className="text-purple-400">{Math.round(scale * 100)}%</span></div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(20,25,40,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-green-400 text-sm">💵</span>
              <span className="text-green-400 font-mono text-sm">${gameState.money.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">🪙</span>
              <span className="text-yellow-400 font-mono text-sm">{gameState.unitCoin.toFixed(6)}</span>
            </div>
            <button 
              onClick={resetGame}
              className={`px-2 py-0.5 rounded text-xs border ${resetConfirm ? 'bg-red-700 text-white border-red-500 animate-pulse' : 'bg-red-900/50 text-red-400 border-red-800 hover:bg-red-800/50'}`}
              title="Reset all progress"
            >
              {resetConfirm ? '⚠️ ARE YOU SURE?' : '🔄 Reset'}
            </button>
          </div>
        </div>

        {/* Cheat Terminal Modal */}
        {cheatTerminalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setCheatTerminalOpen(false)}>
            <div 
              className="p-4 rounded-lg" 
              style={{ background: '#0a0a0a', border: '2px solid #22c55e', minWidth: '300px', boxShadow: '0 0 30px rgba(34,197,94,0.3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-green-400 font-mono text-sm mb-2">{'>'} SYSTEM TERMINAL</div>
              <div>
                <input
                  type="text"
                  value={cheatInput}
                  onChange={(e) => setCheatInput(e.target.value)}
                  onKeyDown={handleCheatKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter command..."
                  autoFocus
                  className="w-full bg-black border border-green-800 rounded px-3 py-2 text-green-400 font-mono text-sm focus:outline-none focus:border-green-500"
                  style={{ caretColor: '#22c55e' }}
                />
                <button 
                  type="button" 
                  onClick={handleCheatSubmit} 
                  className="w-full mt-2 py-1 rounded text-xs font-mono bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-700/50"
                >
                  EXECUTE
                </button>
              </div>
              <div className="text-gray-600 text-xs mt-2 font-mono">Type command + Enter or click Execute</div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {/* Workspace */}
          <div
            ref={workspaceRef}
            className="flex-1 rounded-xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(12,16,28,0.9), rgba(8,12,20,0.95))', border: '1px solid rgba(255,255,255,0.05)', height: '580px' }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Scaled content */}
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%`, height: `${100 / scale}%`, position: 'relative' }}>
              {connections.map((conn, i) => {
                const [fromNode, fromConn] = conn.from.split(':');
                const [toNode, toConn] = conn.to.split(':');
                return <ConnectionLine key={i} startPos={getConnectorPosition(fromNode, fromConn)} endPos={getConnectorPosition(toNode, toConn)} color={conn.color} />;
              })}
              {drawingConnection && <ConnectionLine startPos={drawingConnection.startPos} endPos={mousePos} color={drawingConnection.color} isDrawing />}

              {Object.entries(nodes).map(([id, node]) => (
                <DraggableNode key={id} id={id} position={node.position} onPositionChange={handlePositionChange} scale={scale}>
                  {node.type === 'power-grid' && <PowerGridNode connected={connections.some(c => c.from === `${id}:power-out`)} totalWattage={totalWattage} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} />}
                  {node.type === 'transformer' && <TransformerNode id={id} type={node.transformerType} powerConnected={hasPower(id)} outputConnected={connections.some(c => c.from === `${id}:power-out`)} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'power-strip' && <PowerStripNode id={id} powerConnected={hasPower(id)} outputs={[0,1,2,3].map(i => connections.some(c => c.from === `${id}:power-out-${i}`))} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'pc' && <PCNode id={id} cpu={node.cpu} gpu={node.gpu} ram={node.ram} cooling={node.cooling} os={node.os} powerConnected={hasPower(id)} displayConnected={hasDisplay(id)} programConnections={[0,1,2,3].map(i => connections.some(c => c.from === `${id}:program-out-${i}`))} cpuOC={node.cpuOC || 0} gpuOC={node.gpuOC || 0} ramOC={node.ramOC || 0} isOverheated={node.isOverheated} currentTemp={node.currentTemp} onSlotDrop={(type, itemId, index) => handleSlotDrop(id, type, itemId, index)} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'miner' && <MinerNode id={id} powerConnected={hasPower(id)} displayConnected={hasDisplay(id)} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'interface-hub' && <InterfaceHubNode id={id} inputConnections={[0,1,2,3].map(i => connections.some(c => c.to === `${id}:display-in-${i}`))} outputConnected={connections.some(c => c.from === `${id}:signal-out`)} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'interface' && <InterfaceNode id={id} connected={connections.some(c => c.to === `${id}:display-in`)} pcData={getPCDataForInterface(id)} hasMinerConnected={hasMinerConnected(id)} programData={getProgramDataForInterface(id)} unitCoin={gameState.unitCoin} unitCoinPrice={gameState.unitCoinPrice} money={gameState.money} priceHistory={gameState.priceHistory} onBuy={handleBuy} onSell={handleSell} onSellAll={handleSellAll} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                  {node.type === 'program' && <ProgramNode id={id} type={node.programType} pcConnected={connections.some(c => c.to === `${id}:program-in`)} pcData={getPCForProgram(id)} miningProgress={gameState.unitCoin} money={gameState.money} onSetOverclock={handleSetOverclock} onBetUnitCoin={(amount) => setGameState(prev => ({ ...prev, unitCoin: prev.unitCoin + amount }))} onSpendMoney={(amount) => setGameState(prev => ({ ...prev, money: prev.money - amount }))} onStartConnection={handleStartConnection} onEndConnection={handleEndConnection} onDisconnect={handleDisconnect} />}
                </DraggableNode>
              ))}
            </div>

            <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded bg-black/60 border border-blue-900/30">
              <div className="text-blue-400 text-xs">💡 Drag nodes • Connect outputs→inputs • Click input to disconnect</div>
            </div>
          </div>

          {/* Shop */}
          <div className={`${shopOpen ? 'w-52' : 'w-10'} transition-all duration-300`}>
            <div className="p-2 rounded-xl h-full overflow-y-auto" style={{ background: 'linear-gradient(135deg, rgba(20,25,40,0.9), rgba(10,15,25,0.95))', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '580px' }}>
              <div className="flex items-center justify-between mb-2">
                {shopOpen && <h3 className="text-white text-xs font-medium">🛒 Shop</h3>}
                <button onClick={() => setShopOpen(!shopOpen)} className="text-gray-400 hover:text-white text-xs">{shopOpen ? '◀' : '▶'}</button>
              </div>
              
              {shopOpen && (
                <div className="space-y-2 text-xs">
                  {/* Canvas Upgrades */}
                  <div>
                    <div className="text-pink-500 mb-1 text-xs">🔍 Canvas</div>
                    <div className="space-y-1">
                      {gameState.canvasLevel < 2 && <ShopItem id="canvas-2" type="node" name="Zoom 75%" specs="More space" price={500} owned={false} onBuy={() => handleBuyCanvas(2)} alwaysBuyable />}
                      {gameState.canvasLevel >= 2 && gameState.canvasLevel < 3 && <ShopItem id="canvas-3" type="node" name="Zoom 50%" specs="Maximum space" price={2000} owned={false} onBuy={() => handleBuyCanvas(3)} alwaysBuyable />}
                      {gameState.canvasLevel >= 3 && <div className="text-gray-500 text-xs p-1">Max zoom unlocked</div>}
                    </div>
                  </div>

                  {/* Transformers */}
                  <div>
                    <div className="text-orange-500 mb-1 text-xs">🔋 Batteries</div>
                    <div className="space-y-1">
                      <ShopItem id="transformer-small" type="transformer" name="gUnit 500W" specs="$0.01/s" price={200} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="transformer-medium" type="transformer" name="gUnit 1000W" specs="$0.03/s" price={500} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="transformer-large" type="transformer" name="gUnit Pro Zenith" specs="2500W $0.08/s" price={1200} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                    </div>
                  </div>

                  {/* Nodes */}
                  <div>
                    <div className="text-purple-500 mb-1 text-xs">📦 Nodes</div>
                    <div className="space-y-1">
                      <ShopItem id="power-strip" type="node" name="Power Strip" specs="4-way" price={25} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="miner" type="node" name="aSIC B1 Miner" specs="0.0167/s" price={100} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="interface-hub" type="node" name="Interface Hub" specs="4 inputs" price={40} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                    </div>
                  </div>

                  {/* Programs */}
                  <div>
                    <div className="text-green-500 mb-1 text-xs">💻 Programs</div>
                    <div className="space-y-1">
                      <ShopItem id="cpuburner" type="program" name="CPUBurner" specs="OC CPU 4GB" price={75} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="gpuburner" type="program" name="GPUBurner" specs="OC GPU 4GB" price={100} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="ramburner" type="program" name="RAMBurner" specs="OC RAM 2GB" price={50} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="bitwatcher" type="program" name="BitWatcher" specs="Progress 8GB" price={60} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                      <ShopItem id="uhrome" type="program" name="Uhrome" specs="Browser 6GB" price={0} owned={false} onBuy={handleShopBuy} alwaysBuyable />
                    </div>
                  </div>

                  {/* Cooling */}
                  <div>
                    <div className="text-cyan-500 mb-1 text-xs">❄️ Cooling</div>
                    <div className="space-y-1">
                      <ShopItem id="fan-1" type="cooling" name="OnlyFans Case" specs="-8°C" price={30} owned={inventory['fan-1']} onBuy={handleShopBuy} />
                      <ShopItem id="fan-2" type="cooling" name="OnlyFans Duo" specs="-15°C" price={75} owned={inventory['fan-2']} onBuy={handleShopBuy} />
                      <ShopItem id="aio" type="cooling" name="OnlyAIO Radiator" specs="-25°C" price={200} owned={inventory['aio']} onBuy={handleShopBuy} />
                      <ShopItem id="loop" type="cooling" name="gUNIT Tundra" specs="-40°C" price={500} owned={inventory['loop']} onBuy={handleShopBuy} />
                    </div>
                  </div>

                  {/* CPUs */}
                  <div>
                    <div className="text-cyan-600 mb-1 text-xs">CPUs</div>
                    <div className="space-y-1">
                      <ShopItem id="cpu-1" type="cpu" name="Qnit 1000" specs="1-Core 65W" price={0} owned={inventory['cpu-1']} onBuy={handleShopBuy} />
                      <ShopItem id="cpu-2" type="cpu" name="Qnit 2000" specs="2-Core 95W" price={150} owned={inventory['cpu-2']} onBuy={handleShopBuy} />
                      <ShopItem id="cpu-3" type="cpu" name="Qnit 3000" specs="3-Core 110W" price={300} owned={inventory['cpu-3']} onBuy={handleShopBuy} />
                      <ShopItem id="cpu-4" type="cpu" name="Qnit 4000" specs="4-Core 125W" price={500} owned={inventory['cpu-4']} onBuy={handleShopBuy} />
                    </div>
                  </div>

                  {/* GPUs */}
                  <div>
                    <div className="text-orange-600 mb-1 text-xs">GPUs</div>
                    <div className="space-y-1">
                      <ShopItem id="gpu-8" type="gpu" name="nWOLF 550" specs="8GB 75W" price={0} owned={inventory['gpu-8']} onBuy={handleShopBuy} />
                      <ShopItem id="gpu-10" type="gpu" name="nWOLF 550ti" specs="10GB 95W" price={150} owned={inventory['gpu-10']} onBuy={handleShopBuy} />
                      <ShopItem id="gpu-12" type="gpu" name="nWOLF 1010" specs="12GB 150W" price={350} owned={inventory['gpu-12']} onBuy={handleShopBuy} />
                      <ShopItem id="gpu-14" type="gpu" name="nWOLF 1010ti" specs="14GB 200W" price={600} owned={inventory['gpu-14']} onBuy={handleShopBuy} />
                      <ShopItem id="gpu-24" type="gpu" name="nWOLF Quantum" specs="24GB 320W" price={1200} owned={inventory['gpu-24']} onBuy={handleShopBuy} />
                    </div>
                  </div>

                  {/* RAM */}
                  <div>
                    <div className="text-purple-600 mb-1 text-xs">RAM DDR4</div>
                    <div className="space-y-1">
                      <ShopItem id="ram-8" type="ram" name="aDEP 8GB DDR4" specs="3200MHz" price={0} owned={inventory['ram-8']} onBuy={handleShopBuy} />
                      <ShopItem id="ram-16" type="ram" name="aDEP 16GB DDR4" specs="3600MHz" price={80} owned={inventory['ram-16']} onBuy={handleShopBuy} />
                      <ShopItem id="ram-32" type="ram" name="aDEP 32GB DDR4" specs="3600MHz" price={200} owned={inventory['ram-32']} onBuy={handleShopBuy} />
                    </div>
                  </div>

                  {/* RAM DDR5 */}
                  <div>
                    <div className="text-pink-500 mb-1 text-xs">RAM DDR5 ⚡</div>
                    <div className="space-y-1">
                      <ShopItem id="ram-8-p" type="ram" name="aDEP 8GB PERF" specs="DDR5 +15% UGS" price={60} owned={inventory['ram-8-p']} onBuy={handleShopBuy} />
                      <ShopItem id="ram-16-p" type="ram" name="aDEP 16GB PERF" specs="DDR5 +20% UGS" price={150} owned={inventory['ram-16-p']} onBuy={handleShopBuy} />
                      <ShopItem id="ram-32-p" type="ram" name="aDEP 32GB PERF" specs="DDR5 +25% UGS" price={350} owned={inventory['ram-32-p']} onBuy={handleShopBuy} />
                    </div>
                  </div>

                  {/* OS */}
                  <div>
                    <div className="text-green-600 mb-1 text-xs">OS (Program Slots)</div>
                    <div className="space-y-1">
                      <ShopItem id="trader-os" type="os" name="TraderOS v1" specs="1 slot" price={0} owned={inventory['trader-os']} onBuy={handleShopBuy} />
                      <ShopItem id="trader-os-2" type="os" name="TraderOS v2" specs="2 slots 16GB" price={200} owned={inventory['trader-os-2']} onBuy={handleShopBuy} />
                      <ShopItem id="miner-os" type="os" name="MinerOS Pro" specs="3 slots 32GB" price={500} owned={inventory['miner-os']} onBuy={handleShopBuy} />
                      <ShopItem id="miner-os-2" type="os" name="MinerOS Ultra" specs="4 slots 64GB" price={1200} owned={inventory['miner-os-2']} onBuy={handleShopBuy} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}