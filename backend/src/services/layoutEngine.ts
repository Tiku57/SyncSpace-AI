import { WorkspaceItem } from '../types';

export interface ValidationResult {
  collisionCount: number;
  realismScore: number;
  ergonomicsScore: number;
  symmetryScore: number;
  aestheticScore: number;
}

interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

const getDimensions = (type: string): [number, number, number] => {
  switch (type) {
    case 'desk': return [3.2, 1.0, 1.6]; // thick top is mostly logical bounds
    case 'monitor': return [1.6, 1.075, 0.4];
    case 'chair': return [0.6, 0.8, 0.6];
    case 'keyboard': return [0.4, 0.05, 0.15];
    case 'mouse': return [0.08, 0.05, 0.1];
    case 'laptop': return [0.4, 0.25, 0.3];
    case 'tablet': return [0.25, 0.35, 0.1];
    case 'stand': return [1.2, 0.05, 0.6];
    case 'box': return [0.5, 0.5, 0.5]; // Desktop PC
    case 'tv': return [2.4, 1.3, 0.15];
    case 'speakers': return [0.2, 0.4, 0.3];
    case 'webcam': return [0.1, 0.05, 0.05];
    default: return [0.5, 0.5, 0.5];
  }
};

const getAABB = (item: WorkspaceItem): AABB => {
  const [w, h, d] = getDimensions(item.type);
  const [x, y, z] = item.position;
  return {
    minX: x - w/2, maxX: x + w/2,
    minY: y, maxY: y + h,
    minZ: z - d/2, maxZ: z + d/2
  };
};

const checkCollision = (a: AABB, b: AABB): boolean => {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
};

export const resolveLayout = (items: WorkspaceItem[]): { resolvedWorkspace: WorkspaceItem[], validation: ValidationResult } => {
  if (items.length === 0) {
    return {
      resolvedWorkspace: [],
      validation: { collisionCount: 0, realismScore: 100, ergonomicsScore: 100, symmetryScore: 100, aestheticScore: 100 }
    };
  }

  // 1. Generate Candidate Variations
  const pcPositions = ['floor_left', 'floor_right'];
  const laptopPositions = ['left', 'right', 'center'];

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (const pcPos of pcPositions) {
    for (const lapPos of laptopPositions) {
      const { workspace, collisionCount } = resolveCandidate(items, pcPos, lapPos);
      
      const realismScore = collisionCount > 0 ? 0 : 100;
      const aestheticScore = collisionCount === 0 ? 100 : 50;
      const ergonomicsScore = collisionCount === 0 ? 100 : 50;
      const symmetryScore = 100; // Simplified

      const score = realismScore + aestheticScore + ergonomicsScore + symmetryScore - (collisionCount * 1000);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = {
          resolvedWorkspace: workspace,
          validation: { collisionCount, realismScore, ergonomicsScore, symmetryScore, aestheticScore }
        };
      }
    }
  }

  return bestCandidate!;
};

const resolveCandidate = (originalItems: WorkspaceItem[], pcPos: string, lapPos: string) => {
  let items = JSON.parse(JSON.stringify(originalItems)) as WorkspaceItem[];
  
  const deskY = 1.0;
  
  const desk = items.find(i => i.type === 'desk');
  const monitors = items.filter(i => i.type === 'monitor');
  const keyboards = items.filter(i => i.type === 'keyboard');
  const mice = items.filter(i => i.type === 'mouse');
  const speakers = items.filter(i => i.type === 'speakers');
  const tvs = items.filter(i => i.type === 'tv');
  const laptops = items.filter(i => i.type === 'laptop');
  const stands = items.filter(i => i.type === 'stand');
  const boxes = items.filter(i => i.type === 'box');
  const chairs = items.filter(i => i.type === 'chair');
  const webcams = items.filter(i => i.type === 'webcam');
  
  if (desk) desk.position = [0, 0, 0];

  stands.forEach((s) => {
    s.position = [0, deskY, -0.4]; // Center back of desk
  });

  const standHeight = stands.length > 0 ? getDimensions('stand')[1] : 0;
  const monitorBaseY = deskY + standHeight;
  const mDim = getDimensions('monitor');
  
  let maxMonitorY = deskY;
  let maxMonitorX = 0; // For speaker placement

  // Monitor Placement
  if (monitors.length > 0) {
    const spacing = 0.15; // Minimum spacing
    const effectiveWidth = mDim[0] + spacing;
    
    if (monitors.length <= 3) {
      // Single row, centered
      const count = monitors.length;
      const startX = -((count - 1) * effectiveWidth) / 2;
      for (let i = 0; i < count; i++) {
        const x = startX + (i * effectiveWidth);
        const rotY = x === 0 ? 0 : (x < 0 ? 15 : -15) * (Math.PI / 180);
        monitors[i].position = [x, monitorBaseY, -0.4];
        monitors[i].rotation = [0, rotY, 0];
      }
      maxMonitorY = monitorBaseY + mDim[1];
      maxMonitorX = (count * effectiveWidth) / 2;
    } else if (monitors.length <= 6) {
      // Two rows: bottom row max 3
      const bottomCount = Math.min(3, monitors.length);
      const topCount = monitors.length - bottomCount;
      
      const bottomStartX = -((bottomCount - 1) * effectiveWidth) / 2;
      for (let i = 0; i < bottomCount; i++) {
        const x = bottomStartX + (i * effectiveWidth);
        const rotY = x === 0 ? 0 : (x < 0 ? 15 : -15) * (Math.PI / 180);
        monitors[i].position = [x, monitorBaseY, -0.4];
        monitors[i].rotation = [0, rotY, 0];
      }
      
      const topBaseY = monitorBaseY + mDim[1] + 0.05;
      const topStartX = -((topCount - 1) * effectiveWidth) / 2;
      for (let i = 0; i < topCount; i++) {
        const x = topStartX + (i * effectiveWidth);
        const rotY = x === 0 ? 0 : (x < 0 ? 15 : -15) * (Math.PI / 180);
        monitors[bottomCount + i].position = [x, topBaseY, -0.4];
        monitors[bottomCount + i].rotation = [0, rotY, 0];
      }
      maxMonitorY = topBaseY + mDim[1];
      maxMonitorX = (Math.max(bottomCount, topCount) * effectiveWidth) / 2;
    } else {
      // 7-10+ Monitors: Curved grid layout
      const radius = 2.5; // Curve radius
      let rows = monitors.length <= 8 ? 2 : 3;
      let countPerRow = Math.ceil(monitors.length / rows);
      
      let currentMonitor = 0;
      for (let r = 0; r < rows; r++) {
        const y = monitorBaseY + (r * (mDim[1] + 0.05));
        const countInRow = (r === rows - 1) ? (monitors.length - currentMonitor) : countPerRow;
        const angleStep = 0.4; // radians
        const startAngle = -((countInRow - 1) * angleStep) / 2;
        
        for (let i = 0; i < countInRow; i++) {
           const angle = startAngle + (i * angleStep);
           const x = radius * Math.sin(angle);
           const z = -0.4 - (radius - (radius * Math.cos(angle)));
           monitors[currentMonitor].position = [x, y, z];
           monitors[currentMonitor].rotation = [0, -angle, 0]; // facing center
           currentMonitor++;
           
           maxMonitorX = Math.max(maxMonitorX, Math.abs(x) + mDim[0]/2);
        }
        maxMonitorY = Math.max(maxMonitorY, y + mDim[1]);
      }
    }
  }

  // Keyboard & Mouse
  if (keyboards.length > 0) {
    const kWidth = getDimensions('keyboard')[0];
    keyboards[0].position = [0, deskY, 0.2];
    if (mice.length > 0) {
      mice[0].position = [(kWidth / 2) + 0.15, deskY, 0.2];
    }
  } else if (mice.length > 0) {
    mice[0].position = [0.3, deskY, 0.2];
  }

  // Laptops (Wings)
  laptops.forEach((l, idx) => {
    const lz = 0.2;
    if (idx === 0) {
       l.position = [-1.4, deskY, lz];
    } else if (idx === 1) {
       l.position = [1.4, deskY, lz];
    } else {
       l.position = [(-1.4 + (idx * 0.2)), deskY, lz];
    }
    l.rotation = [0, 0, 0];
  });

  // Speakers (Symmetrical outer edges)
  if (speakers.length > 0) {
    const offset = Math.max(0.8, maxMonitorX + 0.3); // Just outside monitors
    speakers[0].position = [-offset, deskY, -0.2];
    speakers[0].rotation = [0, 15 * (Math.PI / 180), 0];
    if (speakers.length > 1) {
      speakers[1].position = [offset, deskY, -0.2];
      speakers[1].rotation = [0, -15 * (Math.PI / 180), 0];
    }
  }

  // TVs (Above everything, behind)
  const tvSpacing = 0.1;
  const tvDim = getDimensions('tv');
  const tvY = maxMonitorY + 0.3; // 30cm clearance minimum
  
  if (tvs.length > 0) {
     const tvWidthTotal = tvDim[0] + tvSpacing;
     const startX = -((tvs.length - 1) * tvWidthTotal) / 2;
     tvs.forEach((tv, idx) => {
       tv.position = [startX + (idx * tvWidthTotal), tvY, -0.8];
       tv.rotation = [0, 0, 0];
     });
  }

  // Webcam (Center-top of the highest monitor)
  if (webcams.length > 0) {
    if (monitors.length > 0) {
      // Find the highest center monitor
      let topMonitors = monitors.filter(m => m.position[1] >= maxMonitorY - mDim[1] - 0.1);
      // Sort by X distance to center (0)
      topMonitors.sort((a, b) => Math.abs(a.position[0]) - Math.abs(b.position[0]));
      if (topMonitors.length > 0) {
        const anchor = topMonitors[0];
        webcams.forEach(w => {
           w.position = [anchor.position[0], anchor.position[1] + mDim[1], anchor.position[2]];
           w.rotation = [0, anchor.rotation[1], 0]; // Match the rotation of the monitor
        });
      }
    } else {
      webcams.forEach(w => { w.position = [0, deskY, -0.3]; });
    }
  }

  // PC Towers (Floor)
  boxes.forEach((box, idx) => {
    const side = pcPos === 'floor_left' ? -1 : 1;
    const xBase = side * 1.3;
    box.position = [xBase + (idx * 0.6), 0, 0.5];
    box.rotation = [0, 0, 0];
  });

  // Chairs
  chairs.forEach(c => {
    c.position = [0, 0, 0.8]; // Behind desk
  });

  // HIERARCHICAL COLLISION DETECTION & RESOLUTION
  // We resolve collisions based on a rigid priority hierarchy.
  // Level 1: Desk, Level 2: Floor items (PC, Chair), Level 3: Desktop Items (Keyboard, Laptop, Speakers)
  // Level 4: Monitors, Level 5: TVs, Level 6: Webcam
  
  const getHierarchy = (item: WorkspaceItem) => {
    if (item.type === 'desk') return 1;
    if (['box', 'chair'].includes(item.type)) return 2;
    if (['laptop', 'keyboard', 'mouse', 'speakers', 'stand'].includes(item.type)) return 3;
    if (item.type === 'monitor') return 4;
    if (item.type === 'tv') return 5;
    if (item.type === 'webcam') return 6;
    return 10;
  };

  let loopCollisions = 0;
  for (let loop = 0; loop < 100; loop++) {
    loopCollisions = 0;
    
    for (let i = 0; i < items.length; i++) {
      const itemA = items[i];
      const boxA = getAABB(itemA);
      
      // Enforce Desk Bounds for Desktop Items
      if (itemA.position[1] >= deskY && itemA.type !== 'tv' && itemA.type !== 'box' && itemA.type !== 'chair') {
        const deskBounds = getDimensions('desk');
        const limitX = (deskBounds[0] / 2) - 0.1;
        if (itemA.position[0] > limitX) itemA.position[0] = limitX;
        if (itemA.position[0] < -limitX) itemA.position[0] = -limitX;
      }

      for (let j = i + 1; j < items.length; j++) {
        const itemB = items[j];
        
        // Webcam ignores Monitors because it sits tightly on top
        if ((itemA.type === 'webcam' && itemB.type === 'monitor') || (itemB.type === 'webcam' && itemA.type === 'monitor')) {
          continue;
        }

        const boxB = getAABB(itemB);
        
        if (checkCollision(boxA, boxB)) {
          loopCollisions++;
          
          const rankA = getHierarchy(itemA);
          const rankB = getHierarchy(itemB);
          
          const dx = itemB.position[0] - itemA.position[0];
          const dz = itemB.position[2] - itemA.position[2];

          // TV vs Monitor collision: TV should move UP (Y-axis)
          if ((itemA.type === 'tv' && itemB.type === 'monitor') || (itemB.type === 'tv' && itemA.type === 'monitor')) {
             const tv = itemA.type === 'tv' ? itemA : itemB;
             tv.position[1] += 0.1; 
             continue;
          }

          if (rankA < rankB) {
            // A is rigid, B moves
            if (Math.abs(dx) > Math.abs(dz)) { itemB.position[0] += dx > 0 ? 0.05 : -0.05; }
            else { itemB.position[2] += dz > 0 ? 0.05 : -0.05; }
          } else if (rankB < rankA) {
            // B is rigid, A moves
            if (Math.abs(dx) > Math.abs(dz)) { itemA.position[0] += dx < 0 ? 0.05 : -0.05; }
            else { itemA.position[2] += dz < 0 ? 0.05 : -0.05; }
          } else {
            // Same rank, both spread
            if (Math.abs(dx) > Math.abs(dz)) {
              const push = dx > 0 ? 0.05 : -0.05;
              itemB.position[0] += push;
              itemA.position[0] -= push;
            } else {
              const push = dz > 0 ? 0.05 : -0.05;
              itemB.position[2] += push;
              itemA.position[2] -= push;
            }
          }
        }
      }
    }
    if (loopCollisions === 0) break;
  }

  return { workspace: items, collisionCount: loopCollisions };
};
