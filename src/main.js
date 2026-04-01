import './style.css'

// CONFIGURACIÓN DE COLORES
const COLORS = [
  '#ef4444', // Rojo
  '#3b82f6', // Azul
  '#22c55e', // Verde
  '#eab308', // Amarillo
  '#a855f7', // Púrpura
  '#06b6d4', // Cian
  '#f97316', // Naranja
  '#ec4899', // Rosa
  '#64748b'  // Gris
];

// ESTADO DEL JUEGO
let gameState = {
  level: parseInt(localStorage.getItem('currentLevel')) || 1,
  completedLevels: parseInt(localStorage.getItem('completedLevels')) || 0,
  gems: parseInt(localStorage.getItem('gems')) || 0,
  tubes: [], // Array de objetos { capacity: 4, layers: [{color, revealed}, ...] }
  selectedTubeIndex: null,
  history: []
};

// ELEMENTOS DEL DOM
let board, levelNumLabel, gemsCountLabel, undoBtn, resetBtn, homeBtn, nextLevelBtn, extraTubeBtn;
let victoryModal, nextLevelBtnModal, totalCompletedLabel;
let resetModal, confirmResetBtn, cancelResetBtn;

function initDOMElements() {
  const elements = [
    { name: 'board', id: 'game-board' },
    { name: 'levelNumLabel', id: 'level-number' },
    { name: 'gemsCountLabel', id: 'gems-count' },
    { name: 'undoBtn', id: 'undo-btn' },
    { name: 'resetBtn', id: 'reset-btn' },
    { name: 'homeBtn', id: 'home-btn' },
    { name: 'extraTubeBtn', id: 'extra-tube-btn' },
    { name: 'nextLevelBtn', id: 'next-level-btn' },
    { name: 'victoryModal', id: 'victory-modal' },
    { name: 'nextLevelBtnModal', id: 'next-level-btn-modal' },
    { name: 'totalCompletedLabel', id: 'total-completed' },
    { name: 'resetModal', id: 'reset-modal' },
    { name: 'confirmResetBtn', id: 'confirm-reset-btn' },
    { name: 'cancelResetBtn', id: 'cancel-reset-btn' }
  ];

  elements.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) {
    //  console.warn(`⚠️ Warning: Element with ID '${item.id}' not found!`);
    }
    // Asignar dinámicamente a las variables globales
    switch(item.name) {
      case 'board': board = el; break;
      case 'levelNumLabel': levelNumLabel = el; break;
      case 'gemsCountLabel': gemsCountLabel = el; break;
      case 'undoBtn': undoBtn = el; break;
      case 'resetBtn': resetBtn = el; break;
      case 'homeBtn': homeBtn = el; break;
      case 'extraTubeBtn': extraTubeBtn = el; break;
      case 'nextLevelBtn': nextLevelBtn = el; break;
      case 'victoryModal': victoryModal = el; break;
      case 'nextLevelBtnModal': nextLevelBtnModal = el; break;
      case 'totalCompletedLabel': totalCompletedLabel = el; break;
      case 'resetModal': resetModal = el; break;
      case 'confirmResetBtn': confirmResetBtn = el; break;
      case 'cancelResetBtn': cancelResetBtn = el; break;
    }
  });
}

/**
 * Inicializa un nivel
 */
function initLevel(level) {
  const numColors = Math.min(2 + Math.floor((level - 1) / 3), COLORS.length);
  const numEmptyTubes = 2;
  const totalTubes = numColors + numEmptyTubes;
  
  // 1. Crear tubos llenos (Estado resuelto)
  let tubes = [];
  for (let i = 0; i < numColors; i++) {
    // Variabilidad de capacidad (4 o 5 en niveles altos)
    const capacity = (level > 10 && Math.random() > 0.7) ? 5 : 4;
    const layers = Array(capacity).fill(0).map(() => ({ 
      color: COLORS[i], 
      revealed: true 
    }));
    tubes.push({ capacity, layers });
  }
  
  for (let i = 0; i < numEmptyTubes; i++) {
    tubes.push({ capacity: 4, layers: [] });
  }

  // 2. Desordenar
  shuffleTubes(tubes, level * 10 + 20);

  // 3. Aplicar capas ocultas (Nivel 5+)
  if (level >= 5) {
    tubes.forEach(tube => {
      tube.layers.forEach((layer, idx) => {
        // Solo las capas que NO están arriba podrían estar ocultas
        if (idx < tube.layers.length - 1) {
          layer.revealed = Math.random() > 0.4;
        }
      });
    });
  }

  gameState.tubes = tubes;
  gameState.level = level;
  gameState.selectedTubeIndex = null;
  gameState.history = [];
  
  localStorage.setItem('currentLevel', level);
  render();
}

/**
 * Algoritmo de Shuffle que garantiza solución
 */
function shuffleTubes(tubes, moves) {
  let count = 0;
  while (count < moves) {
    const fromIndex = Math.floor(Math.random() * tubes.length);
    const toIndex = Math.floor(Math.random() * tubes.length);

    const fromTube = tubes[fromIndex];
    const toTube = tubes[toIndex];

    if (fromIndex === toIndex) continue;
    if (fromTube.layers.length === 0) continue;
    if (toTube.layers.length === toTube.capacity) continue;

    // Mover un bloque
    const layer = fromTube.layers.pop();
    toTube.layers.push(layer);
    count++;
  }
}

/**
 * Lógica de vertido
 */
function handleTubeClick(index) {
  if (gameState.selectedTubeIndex === null) {
    // Seleccionar si el tubo no está vacío
    if (gameState.tubes[index].layers.length > 0) {
      gameState.selectedTubeIndex = index;
    }
  } else {
    const fromIdx = gameState.selectedTubeIndex;
    const toIdx = index;

    if (fromIdx === toIdx) {
      gameState.selectedTubeIndex = null;
    } else {
      if (canPour(fromIdx, toIdx)) {
        pour(fromIdx, toIdx);
      } else {
        // Feedback de error
        const tubeEl = document.querySelectorAll('.tube')[toIdx];
        tubeEl.classList.add('invalid');
        setTimeout(() => tubeEl.classList.remove('invalid'), 300);
        
        // Si tocamos otro tubo con contenido, lo seleccionamos como nuevo origen
        if (gameState.tubes[toIdx].layers.length > 0) {
          gameState.selectedTubeIndex = toIdx;
        } else {
          gameState.selectedTubeIndex = null;
        }
      }
    }
  }
  render();
  checkWin();
}

function canPour(fromIdx, toIdx) {
  const fromTube = gameState.tubes[fromIdx];
  const toTube = gameState.tubes[toIdx];

  if (fromTube.layers.length === 0) return false;
  if (toTube.layers.length === toTube.capacity) return false;

  const colorToPour = fromTube.layers[fromTube.layers.length - 1].color;
  const topColorTo = toTube.layers.length > 0 ? toTube.layers[toTube.layers.length - 1].color : null;

  // Regla: el color debe coincidir o el tubo destino estar vacío
  return toTube.layers.length === 0 || topColorTo === colorToPour;
}

function pour(fromIdx, toIdx) {
  // Guardar historial para Undo
  gameState.history.push(JSON.parse(JSON.stringify(gameState.tubes)));

  const fromTube = gameState.tubes[fromIdx];
  const toTube = gameState.tubes[toIdx];
  const colorToPour = fromTube.layers[fromTube.layers.length - 1].color;

  // Mover todas las capas contiguas del mismo color que quepan
  while (
    fromTube.layers.length > 0 && 
    fromTube.layers[fromTube.layers.length - 1].color === colorToPour && 
    toTube.layers.length < toTube.capacity
  ) {
    const layer = fromTube.layers.pop();
    layer.revealed = true; // Al moverse se revela
    toTube.layers.push(layer);
  }

  // Revelar la nueva capa superior del tubo origen
  if (fromTube.layers.length > 0) {
    fromTube.layers[fromTube.layers.length - 1].revealed = true;
  }

  gameState.selectedTubeIndex = null;
  
  // Haptic feedback (Android)
  if (window.navigator?.vibrate) {
    window.navigator.vibrate(20);
  }
}

function checkWin() {
  const isWon = gameState.tubes.every(tube => {
    if (tube.layers.length === 0) return true;
    if (tube.layers.length !== tube.capacity) return false;
    return tube.layers.every(layer => layer.color === tube.layers[0].color);
  });

  if (isWon) {
    // Premiar al jugador
    const reward = 10;
    gameState.gems += reward;
    gameState.completedLevels += 1;
    
    localStorage.setItem('gems', gameState.gems);
    localStorage.setItem('completedLevels', gameState.completedLevels);

    // Mostrar Modal
    totalCompletedLabel.textContent = gameState.completedLevels;
    victoryModal.classList.remove('hidden');
    
    // Haptic feedback de victoria
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([50, 30, 50]);
    }

    triggerVictoryParticles();
  }
}

function triggerVictoryParticles() {
  const colors = ['#fde047', '#fbbf24', '#f59e0b', '#ffffff']; // Tonos dorados y blanco
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const size = Math.random() * 8 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.backgroundColor = color;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
    p.style.setProperty('--dy', `${(Math.random() - 0.5) * 200}px`);
    
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

/**
 * Renderizado del DOM
 */
function render() {
  if (levelNumLabel) levelNumLabel.textContent = gameState.level;
  if (gemsCountLabel) gemsCountLabel.textContent = gameState.gems;
  if (!board) return;
  board.innerHTML = '';

  gameState.tubes.forEach((tube, i) => {
    const tubeEl = document.createElement('div');
    tubeEl.className = `tube ${gameState.selectedTubeIndex === i ? 'selected' : ''}`;
    tubeEl.style.height = `calc(${tube.capacity} * 55px)`; // Ajuste dinámico de altura
    tubeEl.onclick = () => handleTubeClick(i);

    tube.layers.forEach(layer => {
      const liquidEl = document.createElement('div');
      liquidEl.className = `liquid ${layer.revealed ? '' : 'mystery'}`;
      liquidEl.style.backgroundColor = layer.color;
      liquidEl.style.height = `${100 / tube.capacity}%`;
      tubeEl.appendChild(liquidEl);
    });

    board.appendChild(tubeEl);
  });

  undoBtn.disabled = gameState.history.length === 0;
}

// EVENT LISTENERS
function setupEventListeners() {
  if (undoBtn) {
    undoBtn.onclick = () => {
      if (gameState.history.length > 0) {
        gameState.tubes = gameState.history.pop();
        gameState.selectedTubeIndex = null;
        render();
      }
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('¿Reiniciar nivel?')) {
        initLevel(gameState.level);
      }
    };
  }

  if (homeBtn) {
    homeBtn.onclick = () => {
      // Usamos el modal custom en lugar de window.confirm que puede ser bloqueado por PWA
      resetModal.classList.remove('hidden');
    };
  }

  if (confirmResetBtn) {
    confirmResetBtn.onclick = () => {
      resetModal.classList.add('hidden');
      localStorage.clear();
      gameState.level = 1;
      gameState.completedLevels = 0;
      gameState.gems = 0;
      totalCompletedLabel.textContent = '0';
      initLevel(1);
    };
  }

  if (cancelResetBtn) {
    cancelResetBtn.onclick = () => {
      resetModal.classList.add('hidden');
    };
  }

  if (nextLevelBtn) {
    nextLevelBtn.onclick = () => {
      nextLevelBtn.classList.add('hidden');
      initLevel(gameState.level + 1);
    };
  }

  if (nextLevelBtnModal) {
    nextLevelBtnModal.onclick = () => {
      victoryModal.classList.add('hidden');
      initLevel(gameState.level + 1);
    };
  }

  // Power-up Extra Tube
  if (extraTubeBtn) {
    extraTubeBtn.onclick = () => {
      if (gameState.gems >= 50) {
        // Limitar a un tubo extra por nivel
        const extraTubesAdded = gameState.tubes.filter(t => t.isExtra).length;
        if (extraTubesAdded >= 1) {
          alert('Ya has añadido un tubo extra en este nivel.');
          return;
        }

        gameState.gems -= 50;
        gameState.tubes.push({ capacity: 4, layers: [], isExtra: true });
        localStorage.setItem('gems', gameState.gems);
        render();
        updateShopUI();
      } else {
        alert('¡No tienes suficientes Gotas de Luz! (Necesitas 50)');
      }
    };
  }
}

function updateShopUI() {
  // Función eliminada (skins desactivadas)
}

// INICIO
window.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  setupEventListeners();
  initLevel(gameState.level);
});

