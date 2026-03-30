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
  tubes: [], // Array de arrays [[color, color, color, color], ...]
  selectedTubeIndex: null,
  history: []
};

const TUBE_CAPACITY = 4;

// ELEMENTOS DEL DOM (se obtendrán al inicio)
let board, levelNumLabel, gemsCountLabel, undoBtn, resetBtn, homeBtn, nextLevelBtn;
let victoryModal, nextLevelBtnModal, totalCompletedLabel;
let resetModal, confirmResetBtn, cancelResetBtn;

function initDOMElements() {
  board = document.getElementById('game-board');
  levelNumLabel = document.getElementById('level-number');
  gemsCountLabel = document.getElementById('gems-count');
  undoBtn = document.getElementById('undo-btn');
  resetBtn = document.getElementById('reset-btn');
  homeBtn = document.getElementById('home-btn');
  nextLevelBtn = document.getElementById('next-level-btn');
  victoryModal = document.getElementById('victory-modal');
  nextLevelBtnModal = document.getElementById('next-level-btn-modal');
  totalCompletedLabel = document.getElementById('total-completed');
  resetModal = document.getElementById('reset-modal');
  confirmResetBtn = document.getElementById('confirm-reset-btn');
  cancelResetBtn = document.getElementById('cancel-reset-btn');
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
    tubes.push(Array(TUBE_CAPACITY).fill(COLORS[i]));
  }
  for (let i = 0; i < numEmptyTubes; i++) {
    tubes.push([]);
  }

  // 2. Desordenar (Simulando movimientos inversos)
  shuffleTubes(tubes, level * 10 + 20);

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

    if (fromIndex === toIndex) continue;
    if (tubes[fromIndex].length === 0) continue;
    if (tubes[toIndex].length === TUBE_CAPACITY) continue;

    // Mover un bloque del mismo color
    const color = tubes[fromIndex][tubes[fromIndex].length - 1];
    tubes[fromIndex].pop();
    tubes[toIndex].push(color);
    count++;
  }
}

/**
 * Lógica de vertido
 */
function handleTubeClick(index) {
  if (gameState.selectedTubeIndex === null) {
    // Seleccionar si el tubo no está vacío
    if (gameState.tubes[index].length > 0) {
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
        if (gameState.tubes[toIdx].length > 0) {
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

  if (fromTube.length === 0) return false;
  if (toTube.length === TUBE_CAPACITY) return false;

  const colorToPour = fromTube[fromTube.length - 1];
  const topColorTo = toTube[toTube.length - 1];

  // Regla: el color debe coincidir o el tubo destino estar vacío
  return toTube.length === 0 || topColorTo === colorToPour;
}

function pour(fromIdx, toIdx) {
  // Guardar historial para Undo
  gameState.history.push(JSON.parse(JSON.stringify(gameState.tubes)));

  const fromTube = gameState.tubes[fromIdx];
  const toTube = gameState.tubes[toIdx];
  const colorToPour = fromTube[fromTube.length - 1];

  // Mover todas las capas contiguas del mismo color que quepan
  while (
    fromTube.length > 0 && 
    fromTube[fromTube.length - 1] === colorToPour && 
    toTube.length < TUBE_CAPACITY
  ) {
    toTube.push(fromTube.pop());
  }

  gameState.selectedTubeIndex = null;
  
  // Haptic feedback (Android)
  if (window.navigator?.vibrate) {
    window.navigator.vibrate(20);
  }
}

function checkWin() {
  const isWon = gameState.tubes.every(tube => {
    if (tube.length === 0) return true;
    if (tube.length !== TUBE_CAPACITY) return false;
    return tube.every(color => color === tube[0]);
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
  }
}

/**
 * Renderizado del DOM
 */
function render() {
  levelNumLabel.textContent = gameState.level;
  gemsCountLabel.textContent = gameState.gems;
  board.innerHTML = '';

  gameState.tubes.forEach((tube, i) => {
    const tubeEl = document.createElement('div');
    tubeEl.className = `tube ${gameState.selectedTubeIndex === i ? 'selected' : ''}`;
    tubeEl.onclick = () => handleTubeClick(i);

    tube.forEach(color => {
      const liquidEl = document.createElement('div');
      liquidEl.className = 'liquid';
      liquidEl.style.backgroundColor = color;
      liquidEl.style.height = `${100 / TUBE_CAPACITY}%`;
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
}

// INICIO
window.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  setupEventListeners();
  initLevel(gameState.level);
});

