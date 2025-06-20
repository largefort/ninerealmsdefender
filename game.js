// Handle device screen orientation and resize
function handleScreenResize() {
    const gameContainer = document.getElementById('game-container');
    
    function adjustLayout() {
        // Add mobile-specific class for additional styling
        document.body.classList.add('mobile-ui');
        
        // Adjust font sizes based on screen width
        const baseFontSize = window.innerWidth < 480 ? 12 : 14;
        document.body.style.fontSize = `${baseFontSize}px`;
        
        // Adjust realm grid based on screen width
        const realmsContainer = document.getElementById('realms-container');
        if (realmsContainer) {
            if (window.innerWidth < 480) {
                realmsContainer.style.gridTemplateColumns = '1fr';
            } else if (window.innerWidth < 768) {
                realmsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else {
                realmsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
        }
        
        // Adjust battlefield for mobile
        const battlefield = document.getElementById('battlefield');
        if (battlefield) {
            if (window.innerWidth < 768) {
                battlefield.style.flexDirection = 'column';
                const playerSide = document.getElementById('player-side');
                const enemySide = document.getElementById('enemy-side');
                if (playerSide) playerSide.style.height = '50%';
                if (enemySide) enemySide.style.height = '50%';
            }
        }
    }
    
    // Initial adjustment
    adjustLayout();
    
    // Adjust on orientation change
    window.addEventListener('orientationchange', adjustLayout);
    
    // Adjust on resize
    window.addEventListener('resize', adjustLayout);
}

// Modify the onDeviceReady function to include screen resize handling
function onDeviceReady() {
    // Existing device ready code...
    
    // Add screen resize handling
    handleScreenResize();
    
    // Prevent default back button behavior
    document.addEventListener('backbutton', handleBackButton, false);
    
    // Check network status
    checkNetworkStatus();
}

document.addEventListener('deviceready', onDeviceReady, false);

function handleBackButton(e) {
    e.preventDefault();
    // Custom back button logic
    if (document.querySelector('#game-over-screen:not(.hidden)')) {
        restartGame();
    } else if (document.querySelector('#battle-screen:not(.hidden)')) {
        retreat();
    } else if (document.querySelector('#army-preview-screen:not(.hidden)')) {
        returnToAsgard();
    }
}

function checkNetworkStatus() {
    if (navigator.connection) {
        const offlineMessage = document.getElementById('offline-message');
        
        if (navigator.connection.type === Connection.NONE) {
            offlineMessage.style.display = 'block';
        } else {
            offlineMessage.style.display = 'none';
        }
        
        document.addEventListener('offline', () => {
            offlineMessage.style.display = 'block';
        });
        
        document.addEventListener('online', () => {
            offlineMessage.style.display = 'none';
        });
    }
}

import gsap from 'gsap';

// Game state
const gameState = {
    currentSaveSlot: null,
    day: 1,
    resources: 100,
    resourcesPerSecond: 0,
    lastResourceUpdate: Date.now(),
    newGamePlus: false,
    newGamePlusLevel: 0,
    hasDefeatedSurtr: false,
    einherjar: {
        warriors: 0,
        archers: 0,
        shieldMaidens: 0,
        total: 0
    },
    selectedRealm: null,
    gameOver: false,
    surtrAttacked: false,
    victorious: false,
    realms: [
        {
            id: 'asgard',
            name: 'Asgard',
            threatLevel: 0,
            defended: true,
            underAttack: false,
            resourcesPerSecond: 0.5,
            description: 'The realm of the Aesir gods. Your home and base of operations.',
            enemyTypes: []
        },
        {
            id: 'midgard',
            name: 'Midgard',
            threatLevel: 20,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 0.8,
            description: 'Home of humans. Múspell forces have begun to attack villages and towns.',
            enemyTypes: ['fire-demons', 'jotnar-raiders']
        },
        {
            id: 'jotunheim',
            name: 'Jotunheim',
            threatLevel: 50,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 1.0,
            description: 'Land of the giants. The giants have allied with the fire demons.',
            enemyTypes: ['frost-giants', 'jotnar-warriors', 'fire-demons']
        },
        {
            id: 'niflheim',
            name: 'Niflheim',
            threatLevel: 30,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 0.7,
            description: 'The primordial realm of ice and mist, now threatened by the fires of Múspell.',
            enemyTypes: ['fire-demons', 'draugr']
        },
        {
            id: 'muspelheim',
            name: 'Muspelheim',
            threatLevel: 100,
            defended: false,
            underAttack: false,
            resourcesPerSecond: 2.0,
            description: 'The land of fire and home of Surtr. The source of the invasion.',
            enemyTypes: ['fire-giants', 'elite-fire-demons', 'surtr-guards']
        },
        {
            id: 'alfheim',
            name: 'Alfheim',
            threatLevel: 40,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 1.2,
            description: 'Realm of the light elves. Their magical forests are burning.',
            enemyTypes: ['fire-demons', 'corrupted-elves']
        },
        {
            id: 'svartalfheim',
            name: 'Svartalfheim',
            threatLevel: 60,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 1.5,
            description: 'Realm of the dark elves and dwarves. Their forges have been captured.',
            enemyTypes: ['fire-demons', 'dark-elves', 'corrupted-dwarves']
        },
        {
            id: 'vanaheim',
            name: 'Vanaheim',
            threatLevel: 45,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 1.3,
            description: 'Home of the Vanir gods. They request your aid against the fire demons.',
            enemyTypes: ['fire-demons', 'jotnar-warriors']
        },
        {
            id: 'helheim',
            name: 'Helheim',
            threatLevel: 70,
            defended: false,
            underAttack: true,
            resourcesPerSecond: 0.9,
            description: 'Realm of the dead. Even the dead are not safe from Surtr\'s ambitions.',
            enemyTypes: ['fire-demons', 'enslaved-dead', 'helheim-guardians']
        }
    ]
};

// Enemy types and their descriptions
const enemyTypes = {
    'fire-demons': {
        name: 'Fire Demons',
        description: 'Creatures of pure flame from Muspelheim, loyal to Surtr.',
        color: '#ff5722',
        strength: 1.0
    },
    'elite-fire-demons': {
        name: 'Elite Fire Demons',
        description: 'Surtr\'s chosen warriors, empowered by his flame.',
        color: '#ff3d00',
        strength: 1.5
    },
    'jotnar-raiders': {
        name: 'Jotnar Raiders',
        description: 'Giant raiders seeking plunder and destruction.',
        color: '#81c784',
        strength: 0.8
    },
    'jotnar-warriors': {
        name: 'Jotnar Warriors',
        description: 'Trained giant warriors armed with massive weapons.',
        color: '#43a047',
        strength: 1.2
    },
    'frost-giants': {
        name: 'Frost Giants',
        description: 'Massive giants with control over ice and cold.',
        color: '#4fc3f7',
        strength: 1.3
    },
    'fire-giants': {
        name: 'Fire Giants',
        description: 'The most powerful of Surtr\'s giant allies, infused with his flame.',
        color: '#d84315',
        strength: 1.8
    },
    'corrupted-elves': {
        name: 'Corrupted Elves',
        description: 'Light elves twisted by Surtr\'s dark magic.',
        color: '#9c27b0',
        strength: 1.1
    },
    'dark-elves': {
        name: 'Dark Elves',
        description: 'Svartalfheim natives who have allied with Surtr for power.',
        color: '#7e57c2',
        strength: 1.2
    },
    'corrupted-dwarves': {
        name: 'Corrupted Dwarves',
        description: 'Master craftsmen forced to forge weapons for Surtr\'s army.',
        color: '#8d6e63',
        strength: 1.0
    },
    'draugr': {
        name: 'Draugr',
        description: 'Undead warriors from Niflheim, now serving the fire forces.',
        color: '#b0bec5',
        strength: 0.9
    },
    'enslaved-dead': {
        name: 'Enslaved Dead',
        description: 'Souls stolen from Helheim and forced to fight for Surtr.',
        color: '#9e9e9e',
        strength: 0.7
    },
    'helheim-guardians': {
        name: 'Helheim Guardians',
        description: 'Powerful undead guardians corrupted by Surtr\'s influence.',
        color: '#607d8b',
        strength: 1.4
    },
    'surtr-guards': {
        name: 'Surtr\'s Elite Guards',
        description: 'The most powerful beings in Surtr\'s army, only found in Muspelheim.',
        color: '#bf360c',
        strength: 2.0
    }
};

// DOM elements
let elements = {};

// Handles and data for current battle/preview
let currentBattleData = null;
let previewedRealm = null;

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    cacheElements();
    
    // Add event listeners
    setupEventListeners();
    
    // Load save data
    loadSaveSlots();
    
    // Render the realms
    renderRealms();
    
    // Start resource gathering
    startResourceGathering();
    
    // Add screen resize handling for non-Cordova environments
    if (!window.cordova) {
        handleScreenResize();
    }
});

// Cache DOM elements for better performance
function cacheElements() {
    elements = {
        titleScreen: document.getElementById('title-screen'),
        gameScreen: document.getElementById('game-screen'),
        armyPreviewScreen: document.getElementById('army-preview-screen'),
        battleScreen: document.getElementById('battle-screen'),
        gameOverScreen: document.getElementById('game-over-screen'),
        startBtn: document.getElementById('start-btn'),
        realmsContainer: document.getElementById('realms-container'),
        einherjarCount: document.getElementById('einherjar-count'),
        resourceCount: document.getElementById('resource-count'),
        resourcesPerSecond: document.getElementById('resources-per-second'),
        dayCount: document.getElementById('day-count'),
        realmDetails: document.getElementById('realm-details'),
        trainWarriorBtn: document.getElementById('train-warrior'),
        trainArcherBtn: document.getElementById('train-archer'),
        trainShieldMaidenBtn: document.getElementById('train-shield-maiden'),
        nextDayBtn: document.getElementById('next-day-btn'),
        saveGameBtn: document.getElementById('save-game-btn'),
        slotsContainer: document.getElementById('slots-container'),
        saveSlots: document.querySelectorAll('.save-slot'),
        
        // Army preview elements
        previewTitle: document.getElementById('preview-title'),
        previewRealmName: document.getElementById('preview-realm-name'),
        enemyPreview: document.getElementById('enemy-preview'),
        enemyForceDescription: document.getElementById('enemy-force-description'),
        previewWarriors: document.getElementById('preview-warriors'),
        previewArchers: document.getElementById('preview-archers'),
        previewShieldMaidens: document.getElementById('preview-shield-maidens'),
        previewTotal: document.getElementById('preview-total'),
        proceedToBattleBtn: document.getElementById('proceed-to-battle-btn'),
        returnToAsgardBtn: document.getElementById('return-to-asgard-btn'),
        
        // Battle elements
        battleTitle: document.getElementById('battle-title'),
        playerForceCount: document.getElementById('player-force-count'),
        enemyForceCount: document.getElementById('enemy-force-count'),
        playerSide: document.getElementById('player-side'),
        enemySide: document.getElementById('enemy-side'),
        battleLog: document.getElementById('battle-log'),
        autoBattleBtn: document.getElementById('auto-battle-btn'),
        retreatBtn: document.getElementById('retreat-btn'),
        
        // Game over elements
        gameOverTitle: document.getElementById('game-over-title'),
        gameOverMessage: document.getElementById('game-over-message'),
        restartBtn: document.getElementById('restart-btn')
    };
}

// Set up event listeners
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startGame);
    elements.trainWarriorBtn.addEventListener('click', () => trainUnit('warriors', 10));
    elements.trainArcherBtn.addEventListener('click', () => trainUnit('archers', 15));
    elements.trainShieldMaidenBtn.addEventListener('click', () => trainUnit('shieldMaidens', 20));
    elements.nextDayBtn.addEventListener('click', nextDay);
    elements.autoBattleBtn.addEventListener('click', autoBattle);
    elements.retreatBtn.addEventListener('click', retreat);
    elements.restartBtn.addEventListener('click', restartGame);
    elements.saveGameBtn.addEventListener('click', saveGame);
    
    // Army preview screen buttons
    elements.proceedToBattleBtn.addEventListener('click', proceedToBattle);
    elements.returnToAsgardBtn.addEventListener('click', returnToAsgard);
    
    // Set up save slot selection
    elements.saveSlots.forEach(slot => {
        slot.addEventListener('click', () => selectSaveSlot(slot.dataset.slot));
    });
}

// Load save slots from localStorage
function loadSaveSlots() {
    elements.saveSlots.forEach(slotElement => {
        const slotId = slotElement.dataset.slot;
        const saveData = localStorage.getItem(`nineRealms_save_${slotId}`);
        const slotDetails = slotElement.querySelector('.slot-details');
        
        if (saveData) {
            const data = JSON.parse(saveData);
            const ngPlusDisplay = data.newGamePlus ? ` (NG+${data.newGamePlusLevel || 1})` : '';
            slotDetails.innerHTML = `
                <p>Day: ${data.day}${ngPlusDisplay}</p>
                <p>Einherjar: ${data.einherjar.total}</p>
                <p>Realms Defended: ${data.realms.filter(realm => realm.defended).length}/9</p>
                ${data.hasDefeatedSurtr ? '<p class="surtr-defeated">✓ Surtr Defeated</p>' : ''}
            `;
        } else {
            slotDetails.innerHTML = `<p class="empty-slot">Empty Slot</p>`;
        }
    });
}

// Select a save slot
function selectSaveSlot(slotId) {
    // Clear previous selection
    elements.saveSlots.forEach(slot => slot.classList.remove('selected'));
    
    // Set new selection
    const selectedSlot = document.querySelector(`.save-slot[data-slot="${slotId}"]`);
    if (selectedSlot) {
        selectedSlot.classList.add('selected');
    }
    
    gameState.currentSaveSlot = slotId;
    
    // Load save data if it exists
    const saveData = localStorage.getItem(`nineRealms_save_${slotId}`);
    if (saveData) {
        // Update start button text
        elements.startBtn.textContent = 'Continue Journey';
    } else {
        elements.startBtn.textContent = 'Begin Your Journey';
    }
}

// Save the current game state
function saveGame() {
    if (!gameState.currentSaveSlot) {
        alert('Error: No save slot selected. Please restart the game and select a save slot.');
        return;
    }
    
    const saveData = JSON.stringify({
        day: gameState.day,
        resources: gameState.resources,
        resourcesPerSecond: gameState.resourcesPerSecond,
        einherjar: gameState.einherjar,
        realms: gameState.realms,
        newGamePlus: gameState.newGamePlus,
        newGamePlusLevel: gameState.newGamePlusLevel,
        hasDefeatedSurtr: gameState.hasDefeatedSurtr,
        savedAt: new Date().toISOString()
    });
    
    localStorage.setItem(`nineRealms_save_${gameState.currentSaveSlot}`, saveData);
    
    // Show save confirmation
    const saveConfirmation = document.createElement('div');
    saveConfirmation.textContent = 'Game Saved!';
    saveConfirmation.style.position = 'fixed';
    saveConfirmation.style.top = '20px';
    saveConfirmation.style.left = '50%';
    saveConfirmation.style.transform = 'translateX(-50%)';
    saveConfirmation.style.backgroundColor = 'rgba(0, 150, 0, 0.8)';
    saveConfirmation.style.color = 'white';
    saveConfirmation.style.padding = '10px 20px';
    saveConfirmation.style.borderRadius = '5px';
    saveConfirmation.style.zIndex = '1000';
    
    document.body.appendChild(saveConfirmation);
    
    // Remove confirmation after a delay
    gsap.to(saveConfirmation, {
        opacity: 0,
        y: -20,
        delay: 1.5,
        duration: 0.5,
        onComplete: () => saveConfirmation.remove()
    });
    
    // Additional mobile save to device storage
    if (window.cordova && window.cordova.plugin && window.cordova.plugin.storage) {
        window.cordova.plugin.storage.set({
            key: `nineRealms_save_${gameState.currentSaveSlot}`,
            value: JSON.stringify(saveData)
        });
    }
}

// Start the game
function startGame() {
    if (!gameState.currentSaveSlot) {
        alert('Please select a save slot before starting.');
        return;
    }
    
    // Load save if it exists
    const saveData = localStorage.getItem(`nineRealms_save_${gameState.currentSaveSlot}`);
    if (saveData) {
        const data = JSON.parse(saveData);
        
        // Load game state from save
        gameState.day = data.day;
        gameState.resources = data.resources;
        gameState.resourcesPerSecond = data.resourcesPerSecond;
        gameState.einherjar = data.einherjar;
        gameState.realms = data.realms;
        gameState.newGamePlus = data.newGamePlus || false;
        gameState.newGamePlusLevel = data.newGamePlusLevel || 0;
        gameState.hasDefeatedSurtr = data.hasDefeatedSurtr || false;
    }
    
    elements.titleScreen.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    
    // Calculate initial resources per second
    updateResourcesPerSecond();
    
    // Apply New Game+ bonuses if applicable
    if (gameState.newGamePlus) {
        applyNewGamePlusBonuses();
    }
    
    // Welcome message animation for new games only
    if (!saveData) {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.classList.add('welcome-message');
        welcomeMessage.innerHTML = `
            <h2>Odin All-Father,</h2>
            <p>The nine realms are in peril. Surtr has unleashed his fire demons and joined forces with the giants. 
            Train your Einherjar and save the realms before it's too late!</p>
        `;
        welcomeMessage.style.position = 'fixed';
        welcomeMessage.style.top = '50%';
        welcomeMessage.style.left = '50%';
        welcomeMessage.style.transform = 'translate(-50%, -50%)';
        welcomeMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        welcomeMessage.style.padding = '20px';
        welcomeMessage.style.borderRadius = '10px';
        welcomeMessage.style.maxWidth = '600px';
        welcomeMessage.style.textAlign = 'center';
        welcomeMessage.style.zIndex = '1000';
        welcomeMessage.style.border = '2px solid var(--asgard-color)';
        
        document.body.appendChild(welcomeMessage);
        
        gsap.to(welcomeMessage, {
            opacity: 0,
            delay: 4,
            duration: 1,
            onComplete: () => welcomeMessage.remove()
        });
    }
    
    renderRealms();
    updateUI();
}

// Render all realms
function renderRealms() {
    elements.realmsContainer.innerHTML = '';
    
    gameState.realms.forEach(realm => {
        const realmEl = document.createElement('div');
        realmEl.classList.add('realm', realm.id);
        realmEl.dataset.id = realm.id;
        
        const status = realm.defended ? 
            `<span class="defended">Defended</span>` : 
            (realm.underAttack ? `<span class="under-attack">Under Attack</span>` : '');
        
        realmEl.innerHTML = `
            <div class="realm-name">${realm.name}</div>
            ${status}
            <div class="realm-status">
                <span>Threat: ${realm.threatLevel}%</span>
            </div>
            <div class="threat-level" style="width: ${realm.threatLevel}%;"></div>
        `;
        
        realmEl.addEventListener('click', () => selectRealm(realm.id));
        
        elements.realmsContainer.appendChild(realmEl);
    });
}

// Select a realm
function selectRealm(realmId) {
    // Clear previous selection
    const previousSelection = document.querySelector('.realm.active');
    if (previousSelection) {
        previousSelection.classList.remove('active');
    }
    
    // Set new selection
    const selectedElement = document.querySelector(`.realm[data-id="${realmId}"]`);
    if (selectedElement) {
        selectedElement.classList.add('active');
    }
    
    // Update game state
    gameState.selectedRealm = realmId;
    
    // Update realm details
    updateRealmDetails();
}

// Update realm details panel
function updateRealmDetails() {
    if (!gameState.selectedRealm) {
        elements.realmDetails.innerHTML = '<p>Select a realm to view details</p>';
        return;
    }
    
    const realm = gameState.realms.find(r => r.id === gameState.selectedRealm);
    
    if (realm) {
        let actionButton = '';
        
        if (realm.id === 'asgard') {
            actionButton = '<p>Asgard is your stronghold. Defend the other realms.</p>';
        } else if (realm.defended) {
            actionButton = '<p>This realm is secure... for now.</p>';
        } else if (realm.id === 'muspelheim' && gameState.realms.filter(r => !r.defended && r.id !== 'muspelheim').length === 0) {
            actionButton = '<button class="action-btn" id="final-battle-btn">Challenge Surtr</button>';
        } else {
            actionButton = `<button class="action-btn" id="defend-realm-btn">Scout Enemy Forces</button>`;
        }
        
        elements.realmDetails.innerHTML = `
            <h4>${realm.name}</h4>
            <p>${realm.description}</p>
            <p>Threat Level: ${realm.threatLevel}%</p>
            ${actionButton}
        `;
        
        // Add event listeners to the new buttons
        const defendBtn = document.getElementById('defend-realm-btn');
        if (defendBtn) {
            defendBtn.addEventListener('click', () => previewEnemyForces(realm.id));
        }
        
        const finalBattleBtn = document.getElementById('final-battle-btn');
        if (finalBattleBtn) {
            finalBattleBtn.addEventListener('click', () => previewEnemyForces(realm.id, true));
        }
    }
}

// Preview enemy forces before battle
function previewEnemyForces(realmId, isFinalBattle = false) {
    if (gameState.einherjar.total <= 0) {
        alert("You need Einherjar to scout the enemy forces!");
        return;
    }
    
    const realm = gameState.realms.find(r => r.id === realmId);
    if (!realm) return;
    
    // Show army preview screen
    elements.gameScreen.classList.add('hidden');
    elements.armyPreviewScreen.classList.remove('hidden');
    
    // Store previewed realm
    previewedRealm = realm;
    
    // Update preview header
    elements.previewRealmName.textContent = realm.name;
    
    // Calculate enemy forces
    const enemyForces = isFinalBattle ? 100 : Math.ceil(realm.threatLevel * 0.7);
    
    // Display enemy units preview
    elements.enemyPreview.innerHTML = '';
    
    // Display enemy force description
    let enemyDescription = `<h4>Enemy Forces in ${realm.name}:</h4>`;
    
    if (isFinalBattle) {
        // Generate Surtr for final battle
        const surtr = document.createElement('div');
        surtr.classList.add('enemy-commander-preview');
        surtr.style.backgroundColor = '#ff5722';
        elements.enemyPreview.appendChild(surtr);
        
        enemyDescription += `
            <p><strong>Surtr, Lord of Muspelheim</strong>: The ancient fire giant himself leads his forces. His flaming sword can cleave mountains.</p>
            <p><strong>Elite Guards</strong>: ${Math.floor(enemyForces * 0.2)} powerful fire giants loyal to Surtr.</p>
            <p><strong>Fire Demons</strong>: ${Math.floor(enemyForces * 0.8)} creatures of living flame.</p>
            <p><strong>Total Enemy Strength</strong>: Overwhelming</p>
        `;
        
        // Generate some elite guards
        for (let i = 0; i < 10; i++) {
            const eliteGuard = document.createElement('div');
            eliteGuard.classList.add('enemy-unit-preview');
            eliteGuard.style.backgroundColor = enemyTypes['surtr-guards'].color;
            eliteGuard.style.width = '40px';
            eliteGuard.style.height = '40px';
            elements.enemyPreview.appendChild(eliteGuard);
        }
        
        // Generate fire demons
        for (let i = 0; i < 30; i++) {
            const fireDemon = document.createElement('div');
            fireDemon.classList.add('enemy-unit-preview');
            fireDemon.style.backgroundColor = enemyTypes['fire-demons'].color;
            elements.enemyPreview.appendChild(fireDemon);
        }
    } else {
        // Generate random enemy composition based on realm
        const enemyComposition = {};
        let totalEnemyUnits = 0;
        
        realm.enemyTypes.forEach(type => {
            const count = Math.floor((Math.random() * 0.3 + 0.1) * enemyForces);
            enemyComposition[type] = count;
            totalEnemyUnits += count;
            
            enemyDescription += `<p><strong>${enemyTypes[type].name}</strong>: ${count} units</p>`;
        });
        
        enemyDescription += `<p><strong>Total Enemy Forces</strong>: ${totalEnemyUnits}</p>`;
        
        // Generate enemy units for preview
        Object.entries(enemyComposition).forEach(([type, count]) => {
            for (let i = 0; i < Math.min(count, 20); i++) {
                const enemyUnit = document.createElement('div');
                enemyUnit.classList.add('enemy-unit-preview');
                enemyUnit.style.backgroundColor = enemyTypes[type].color;
                elements.enemyPreview.appendChild(enemyUnit);
            }
        });
    }
    
    elements.enemyForceDescription.innerHTML = enemyDescription;
    
    // Update player forces information
    elements.previewWarriors.textContent = gameState.einherjar.warriors;
    elements.previewArchers.textContent = gameState.einherjar.archers;
    elements.previewShieldMaidens.textContent = gameState.einherjar.shieldMaidens;
    elements.previewTotal.textContent = gameState.einherjar.total;
    
    // Store battle data for later
    currentBattleData = {
        realm: realm,
        playerForces: gameState.einherjar.total,
        enemyForces: isFinalBattle ? 100 : Math.ceil(realm.threatLevel * 0.7),
        playerRemaining: gameState.einherjar.total,
        enemyRemaining: isFinalBattle ? 100 : Math.ceil(realm.threatLevel * .7),
        isFinalBattle: isFinalBattle
    };
}

// Return to Asgard from army preview
function returnToAsgard() {
    elements.armyPreviewScreen.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    
    // Clear battle data
    currentBattleData = null;
    previewedRealm = null;
}

// Proceed to battle from army preview
function proceedToBattle() {
    if (!currentBattleData || !previewedRealm) {
        console.error('No battle data available');
        returnToAsgard();
        return;
    }
    
    elements.armyPreviewScreen.classList.add('hidden');
    
    // Start the actual battle
    startBattle(previewedRealm, currentBattleData.isFinalBattle);
}

// Train a unit
function trainUnit(type, cost) {
    if (gameState.resources >= cost) {
        gameState.resources -= cost;
        gameState.einherjar[type]++;
        gameState.einherjar.total++;
        updateUI();
    }
}

// Update UI
function updateUI() {
    elements.einherjarCount.textContent = gameState.einherjar.total;
    elements.resourceCount.textContent = Math.floor(gameState.resources);
    elements.dayCount.textContent = gameState.day;
    
    // Update button states
    elements.trainWarriorBtn.disabled = gameState.resources < 10;
    elements.trainArcherBtn.disabled = gameState.resources < 15;
    elements.trainShieldMaidenBtn.disabled = gameState.resources < 20;
    
    // Update realm details if a realm is selected
    updateRealmDetails();
    
    // Adjust font sizes and touch targets for mobile
    document.body.classList.add('mobile-ui');
}

// Next day
function nextDay() {
    gameState.day++;
    const baseResourceGain = 20;
    gameState.resources += baseResourceGain;
    
    // Add visual effect for resource gain
    addResourceEffect(baseResourceGain);
    
    // Existing realm threat update with invasion visual effect
    gameState.realms.forEach(realm => {
        if (!realm.defended && realm.id !== 'asgard' && realm.id !== 'muspelheim') {
            const realmElement = document.querySelector(`.realm[data-id="${realm.id}"]`);
            if (realmElement) {
                addInvasionEffect(realmElement);
            }
        }
    });
    
    // Rest of existing nextDay logic...
    updateRealmThreats();
    checkGameState();
    renderRealms();
    updateUI();
}

// Update realm threats
function updateRealmThreats() {
    gameState.realms.forEach(realm => {
        if (!realm.defended && realm.id !== 'asgard' && realm.id !== 'muspelheim') {
            // Calculate base threat increase
            let increase = Math.floor(Math.random() * 10) + 5;
            
            // Apply New Game+ threat reduction
            if (gameState.newGamePlus && gameState.newGamePlusLevel > 0) {
                const reduction = Math.min(0.5, gameState.newGamePlusLevel * 0.1);
                increase = Math.floor(increase * (1 - reduction));
            }
            
            // Apply defense bonus reduction
            if (realm.defenseBonusPercentage) {
                increase = Math.floor(increase * (1 - realm.defenseBonusPercentage / 100));
            }
            
            realm.threatLevel = Math.min(100, realm.threatLevel + increase);
            
            // Set under attack
            realm.underAttack = true;
            
            // Check if realm is lost
            if (realm.threatLevel >= 100) {
                realm.threatLevel = 100;
            }
        }
    });
}

// Start a battle
function startBattle(realm, isFinalBattle = false) {
    // Show battle screen
    elements.battleScreen.classList.remove('hidden');
    
    // Set battle title
    if (isFinalBattle) {
        elements.battleTitle.textContent = `Final Battle: Odin vs Surtr`;
    } else {
        elements.battleTitle.textContent = `Battle for ${realm.name}`;
    }
    
    // Calculate forces
    const playerForces = gameState.einherjar.total;
    const enemyForces = isFinalBattle ? 100 : Math.ceil(realm.threatLevel * 0.7);
    
    elements.playerForceCount.textContent = playerForces;
    elements.enemyForceCount.textContent = enemyForces;
    
    // Clear battlefield
    elements.playerSide.innerHTML = '';
    elements.enemySide.innerHTML = '';
    elements.battleLog.innerHTML = '';
    
    // Generate units
    generateBattleUnits(playerForces, enemyForces);
    
    // Add Surtr if final battle
    if (isFinalBattle) {
        const surtr = document.createElement('div');
        surtr.classList.add('surtr');
        surtr.style.position = 'absolute';
        surtr.style.width = '50px';
        surtr.style.height = '70px';
        surtr.style.backgroundColor = '#ff5722';
        surtr.style.borderRadius = '10px';
        surtr.style.top = '50%';
        surtr.style.left = '50%';
        surtr.style.transform = 'translate(-50%, -50%)';
        surtr.style.boxShadow = '0 0 20px #ff5722';
        
        elements.enemySide.appendChild(surtr);
        
        // Add Odin
        const odin = document.createElement('div');
        odin.classList.add('odin');
        odin.style.position = 'absolute';
        odin.style.width = '40px';
        odin.style.height = '60px';
        odin.style.backgroundColor = 'var(--asgard-color)';
        odin.style.borderRadius = '10px';
        odin.style.top = '50%';
        odin.style.left = '50%';
        odin.style.transform = 'translate(-50%, -50%)';
        odin.style.boxShadow = '0 0 20px var(--asgard-color)';
        
        elements.playerSide.appendChild(odin);
    }
    
    // Store battle data
    window.battleData = {
        realm,
        playerForces,
        enemyForces,
        playerRemaining: playerForces,
        enemyRemaining: enemyForces,
        isFinalBattle
    };
}

// Generate battle units
function generateBattleUnits(playerForces, enemyForces) {
    // Clear previous units
    elements.playerSide.innerHTML = '';
    elements.enemySide.innerHTML = '';
    
    // Create player units
    for (let i = 0; i < playerForces; i++) {
        const unit = document.createElement('div');
        unit.classList.add('unit', 'player-unit');
        unit.dataset.id = `player-${i}`;
        
        // Random position
        const x = Math.random() * (elements.playerSide.offsetWidth - 40) + 20;
        const y = Math.random() * (elements.playerSide.offsetHeight - 40) + 20;
        
        unit.style.left = `${x}px`;
        unit.style.top = `${y}px`;
        
        elements.playerSide.appendChild(unit);
    }
    
    // Create enemy units
    for (let i = 0; i < enemyForces; i++) {
        const unit = document.createElement('div');
        unit.classList.add('unit', 'enemy-unit');
        unit.dataset.id = `enemy-${i}`;
        
        // Random position
        const x = Math.random() * (elements.enemySide.offsetWidth - 40) + 20;
        const y = Math.random() * (elements.enemySide.offsetHeight - 40) + 20;
        
        unit.style.left = `${x}px`;
        unit.style.top = `${y}px`;
        
        elements.enemySide.appendChild(unit);
    }
}

// Auto battle
function autoBattle() {
    const { realm, playerForces, enemyForces, isFinalBattle } = window.battleData;
    
    elements.autoBattleBtn.disabled = true;
    elements.retreatBtn.disabled = true;
    
    // Add initial battle log entry
    if (isFinalBattle) {
        addBattleLog(`The final battle begins! Odin leads the Einherjar against Surtr himself!`);
    } else {
        addBattleLog(`The battle for ${realm.name} begins! Your Einherjar charge into battle!`);
    }
    
    // Battle simulation variables
    let playerRemaining = playerForces;
    let enemyRemaining = enemyForces;
    let round = 1;
    
    // Add a player advantage or disadvantage based on final battle
    const playerAdvantage = isFinalBattle ? 0.7 : 1.2;  // Player has disadvantage in final battle
    
    // Battle rounds
    const battleInterval = setInterval(() => {
        // Calculate losses
        let playerLosses = Math.floor(Math.random() * 5) + 1;
        let enemyLosses = Math.floor(Math.random() * 6) + 2; 
        
        // Adjust for final battle
        if (isFinalBattle) {
            playerLosses = Math.floor(playerLosses * 1.5);
            enemyLosses = Math.floor(enemyLosses * playerAdvantage);
        }
        
        playerRemaining = Math.max(0, playerRemaining - playerLosses);
        enemyRemaining = Math.max(0, enemyRemaining - enemyLosses);
        
        // Update UI
        elements.playerForceCount.textContent = playerRemaining;
        elements.enemyForceCount.textContent = enemyRemaining;
        
        // Remove units from battlefield
        removeRandomUnits('player-unit', playerLosses);
        removeRandomUnits('enemy-unit', enemyLosses);
        
        // Update battle log
        if (isFinalBattle && round % 3 === 0) {
            // Add special messages for final battle
            const specialMessages = [
                `Surtr swings his flaming sword, devastating your forces!`,
                `Odin counters with Gungnir, piercing through several fire demons!`,
                `The clash of the gods sends shockwaves through Muspelheim!`
            ];
            addBattleLog(specialMessages[Math.floor(Math.random() * specialMessages.length)]);
        } else {
            addBattleLog(`Round ${round}: Your forces lose ${playerLosses} warriors. Enemy loses ${enemyLosses} units.`);
        }
        
        round++;
        
        // Check for battle end
        if (playerRemaining <= 0 || enemyRemaining <= 0) {
            clearInterval(battleInterval);
            endBattle(playerRemaining, enemyRemaining, realm, isFinalBattle);
        }
    }, 1000);
}

// Remove random units from battlefield
function removeRandomUnits(unitClass, count) {
    const units = document.querySelectorAll(`.${unitClass}`);
    const unitsToRemove = Array.from(units)
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(count, units.length));
    
    unitsToRemove.forEach(unit => {
        // Animate death
        gsap.to(unit, {
            opacity: 0,
            scale: 0.5,
            duration: 0.3,
            onComplete: () => unit.remove()
        });
    });
}

// Add entry to battle log
function addBattleLog(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    elements.battleLog.appendChild(entry);
    elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
}

// End battle
function endBattle(playerRemaining, enemyRemaining, realm, isFinalBattle = false) {
    // Determine victor
    if (enemyRemaining <= 0) {
        // Player victory
        if (isFinalBattle) {
            addBattleLog(`Victory! Surtr has been defeated and the nine realms are saved!`);
            
            // Mark Surtr as defeated
            gameState.hasDefeatedSurtr = true;
            
            // End game with victory
            const returnBtn = document.createElement('button');
            returnBtn.textContent = 'End Game';
            returnBtn.classList.add('action-btn');
            returnBtn.style.margin = '10px auto';
            returnBtn.style.display = 'block';
            elements.battleLog.appendChild(returnBtn);
            
            returnBtn.addEventListener('click', () => {
                endGame(true, "You have defeated Surtr and saved the Nine Realms! The World Tree, Yggdrasil, is safe once more. Songs will be sung of your victory for generations to come!");
            });
        } else {
            addBattleLog(`Victory! You have defeated the forces threatening ${realm.name}!`);
            
            // Update realm status
            realm.defended = true;
            realm.underAttack = false;
            realm.threatLevel = 0;
            
            // Update resources per second
            updateResourcesPerSecond();
            
            // Create defense build option
            const defenseBuildContainer = document.createElement('div');
            defenseBuildContainer.classList.add('defense-build-container');
            defenseBuildContainer.innerHTML = `
                <h3>Fortify ${realm.name}</h3>
                <p>Invest resources to strengthen realm defenses:</p>
                <div class="defense-options">
                    <button id="build-watchtowers" class="action-btn defense-btn" data-cost="50">
                        Build Watchtowers (50 Resources)
                        <small>+10% Realm Defense</small>
                    </button>
                    <button id="train-local-militia" class="action-btn defense-btn" data-cost="75">
                        Train Local Militia (75 Resources)
                        <small>+15% Realm Defense</small>
                    </button>
                    <button id="construct-magical-barriers" class="action-btn defense-btn" data-cost="100">
                        Magical Realm Barriers (100 Resources)
                        <small>+25% Realm Defense</small>
                    </button>
                </div>
            `;
            
            // Add to battle log
            elements.battleLog.appendChild(defenseBuildContainer);
            
            // Add event listeners to defense buttons
            const defenseButtons = defenseBuildContainer.querySelectorAll('.defense-btn');
            defenseButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const cost = parseInt(button.dataset.cost);
                    
                    if (gameState.resources >= cost) {
                        // Deduct resources
                        gameState.resources -= cost;
                        
                        // Increase realm defense bonus
                        realm.defenseBonusPercentage = realm.defenseBonusPercentage || 0;
                        
                        switch(button.id) {
                            case 'build-watchtowers':
                                realm.defenseBonusPercentage += 10;
                                break;
                            case 'train-local-militia':
                                realm.defenseBonusPercentage += 15;
                                break;
                            case 'construct-magical-barriers':
                                realm.defenseBonusPercentage += 25;
                                break;
                        }
                        
                        // Limit defense bonus to 100%
                        realm.defenseBonusPercentage = Math.min(100, realm.defenseBonusPercentage);
                        
                        // Add magical barrier effect
                        addMagicalBarrierEffect(realm);
                        
                        // Update UI
                        updateUI();
                        
                        // Remove defense build container
                        defenseBuildContainer.remove();
                        
                        // Show confirmation
                        addBattleLog(`${realm.name} has been fortified! Defense bonus increased.`);
                    } else {
                        alert('Not enough resources to build defenses.');
                    }
                });
            });
            
            // Continue button
            const continueBtn = document.createElement('button');
            continueBtn.textContent = 'Return to Asgard';
            continueBtn.classList.add('action-btn');
            continueBtn.style.margin = '10px auto';
            continueBtn.style.display = 'block';
            elements.battleLog.appendChild(continueBtn);
            
            continueBtn.addEventListener('click', () => {
                // Update einherjar count
                gameState.einherjar.total = playerRemaining;
                
                // Recalculate individual unit types
                const totalLost = gameState.einherjar.warriors + gameState.einherjar.archers + gameState.einherjar.shieldMaidens - playerRemaining;
                
                // Distribute losses proportionally
                const warriorRatio = gameState.einherjar.warriors / gameState.einherjar.total;
                const archerRatio = gameState.einherjar.archers / gameState.einherjar.total;
                const shieldMaidenRatio = gameState.einherjar.shieldMaidens / gameState.einherjar.total;
                
                gameState.einherjar.warriors = Math.floor(gameState.einherjar.warriors - (totalLost * warriorRatio));
                gameState.einherjar.archers = Math.floor(gameState.einherjar.archers - (totalLost * archerRatio));
                gameState.einherjar.shieldMaidens = Math.floor(gameState.einherjar.shieldMaidens - (totalLost * shieldMaidenRatio));
                
                // Return to game screen
                elements.battleScreen.classList.add('hidden');
                elements.gameScreen.classList.remove('hidden');
                
                // Update UI
                renderRealms();
                updateUI();
                
                // Check if all realms are defended
                checkAllRealmsDefended();
            });
        }
    } else {
        // Player defeat
        if (isFinalBattle) {
            addBattleLog(`Defeat! Surtr's might was too great. The Nine Realms will fall to fire and darkness.`);
            
            // Return button
            const returnBtn = document.createElement('button');
            returnBtn.textContent = 'End Game';
            returnBtn.classList.add('action-btn');
            returnBtn.style.margin = '10px auto';
            returnBtn.style.display = 'block';
            elements.battleLog.appendChild(returnBtn);
            
            returnBtn.addEventListener('click', () => {
                endGame(false, "You have been defeated by Surtr. The fire giant now marches on Asgard, and the Nine Realms will burn in his wake.");
            });
        } else {
            addBattleLog(`Defeat! Your forces have been routed from ${realm.name}.`);
            
            // Return button
            const returnBtn = document.createElement('button');
            returnBtn.textContent = 'Retreat to Asgard';
            returnBtn.classList.add('action-btn');
            returnBtn.style.margin = '10px auto';
            returnBtn.style.display = 'block';
            elements.battleLog.appendChild(returnBtn);
            
            returnBtn.addEventListener('click', () => {
                // All einherjar lost
                gameState.einherjar.total = 0;
                gameState.einherjar.warriors = 0;
                gameState.einherjar.archers = 0;
                gameState.einherjar.shieldMaidens = 0;
                
                // Increase threat level
                realm.threatLevel = Math.min(100, realm.threatLevel + 20);
                
                // Return to game screen
                elements.battleScreen.classList.add('hidden');
                elements.gameScreen.classList.remove('hidden');
                
                // Update UI
                renderRealms();
                updateUI();
            });
        }
    }
}

// Retreat from battle
function retreat() {
    const { realm, isFinalBattle } = window.battleData;
    
    if (isFinalBattle) {
        addBattleLog(`You cannot retreat from the final battle with Surtr!`);
        return;
    }
    
    addBattleLog(`You order your Einherjar to retreat back to Asgard!`);
    
    // Lose 30% of forces
    const lossPercentage = 0.3;
    const newTotal = Math.floor(gameState.einherjar.total * (1 - lossPercentage));
    const totalLost = gameState.einherjar.total - newTotal;
    
    // Distribute losses proportionally
    const warriorRatio = gameState.einherjar.warriors / gameState.einherjar.total;
    const archerRatio = gameState.einherjar.archers / gameState.einherjar.total;
    const shieldMaidenRatio = gameState.einherjar.shieldMaidens / gameState.einherjar.total;
    
    gameState.einherjar.warriors = Math.floor(gameState.einherjar.warriors - (totalLost * warriorRatio));
    gameState.einherjar.archers = Math.floor(gameState.einherjar.archers - (totalLost * archerRatio));
    gameState.einherjar.shieldMaidens = Math.floor(gameState.einherjar.shieldMaidens - (totalLost * shieldMaidenRatio));
    gameState.einherjar.total = newTotal;
    
    // Increase threat level
    realm.threatLevel = Math.min(100, realm.threatLevel + 10);
    
    // Return button
    const returnBtn = document.createElement('button');
    returnBtn.textContent = 'Return to Asgard';
    returnBtn.classList.add('action-btn');
    returnBtn.style.margin = '10px auto';
    returnBtn.style.display = 'block';
    elements.battleLog.appendChild(returnBtn);
    
    elements.autoBattleBtn.disabled = true;
    elements.retreatBtn.disabled = true;
    
    returnBtn.addEventListener('click', () => {
        // Return to game screen
        elements.battleScreen.classList.add('hidden');
        elements.gameScreen.classList.remove('hidden');
        
        // Update UI
        renderRealms();
        updateUI();
    });
}

// Check if all realms are defended
function checkAllRealmsDefended() {
    const allDefended = gameState.realms.every(realm => 
        realm.defended || realm.id === 'muspelheim');
    
    if (allDefended) {
        // Show final battle option
        const muspelheim = gameState.realms.find(realm => realm.id === 'muspelheim');
        muspelheim.underAttack = true;
        
        // Select Muspelheim
        selectRealm('muspelheim');
        
        // Show notification
        const notification = document.createElement('div');
        notification.classList.add('notification');
        notification.innerHTML = `
            <h3>All Realms Defended!</h3>
            <p>With all the realms secured, it is time to face Surtr in Muspelheim!</p>
        `;
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        notification.style.padding = '20px';
        notification.style.borderRadius = '10px';
        notification.style.maxWidth = '600px';
        notification.style.textAlign = 'center';
        notification.style.zIndex = '1000';
        notification.style.border = '2px solid var(--asgard-color)';
        
        document.body.appendChild(notification);
        
        gsap.to(notification, {
            opacity: 0,
            delay: 4,
            duration: 1,
            onComplete: () => notification.remove()
        });
    }
}

// Check game state for win/lose conditions
function checkGameState() {
    // Check if Asgard is threatened
    const asgard = gameState.realms.find(realm => realm.id === 'asgard');
    const allOtherRealmsLost = gameState.realms.filter(realm => 
        realm.id !== 'asgard' && realm.id !== 'muspelheim'
    ).every(realm => realm.threatLevel >= 100);
    
    // Game over if 7 days pass and no einherjar trained
    if (gameState.day >= 7 && gameState.einherjar.total === 0) {
        endGame(false, "You failed to train any Einherjar in time. The forces of Muspelheim have overrun the Nine Realms.");
    }
    
    // Game over if all other realms lost
    if (allOtherRealmsLost) {
        gameState.surtrAttacked = true;
        endGame(false, "All the realms have fallen to Surtr. Asgard stands alone and vulnerable.");
    }
}

// End the game
function endGame(victory, message) {
    gameState.gameOver = true;
    gameState.victorious = victory;
    
    elements.gameScreen.classList.add('hidden');
    elements.battleScreen.classList.add('hidden');
    elements.armyPreviewScreen.classList.add('hidden');
    elements.gameOverScreen.classList.remove('hidden');
    
    elements.gameOverTitle.textContent = victory ? "Victory!" : "Defeat!";
    elements.gameOverMessage.textContent = message;
    
    // Add New Game+ option if Surtr was defeated
    if (victory && gameState.hasDefeatedSurtr) {
        const newGamePlusBtn = document.createElement('button');
        newGamePlusBtn.textContent = 'Start New Game+';
        newGamePlusBtn.classList.add('action-btn');
        newGamePlusBtn.id = 'new-game-plus-btn';
        newGamePlusBtn.style.margin = '10px';
        newGamePlusBtn.style.backgroundColor = '#9c27b0';
        newGamePlusBtn.style.color = 'white';
        
        const restartSection = document.querySelector('#game-over-screen');
        restartSection.insertBefore(newGamePlusBtn, elements.restartBtn);
        
        newGamePlusBtn.addEventListener('click', startNewGamePlus);
    }
}

// Restart the game
function restartGame() {
    // Clear save data for current slot if user confirms
    if (confirm("Start a new game? Your current progress will be lost.")) {
        localStorage.removeItem(`nineRealms_save_${gameState.currentSaveSlot}`);
    }
    
    elements.gameOverScreen.classList.add('hidden');
    elements.titleScreen.classList.remove('hidden');
    
    // Reload save slots
    loadSaveSlots();
    
    // Reset game state for new game
    resetGameState();
}

// Start New Game+
function startNewGamePlus() {
    if (!confirm("Start New Game+? This will reset your progress but grant permanent bonuses based on your achievements.")) {
        return;
    }
    
    // Increase New Game+ level
    gameState.newGamePlusLevel = (gameState.newGamePlusLevel || 0) + 1;
    
    // Save New Game+ progress
    const ngPlusData = {
        newGamePlusLevel: gameState.newGamePlusLevel,
        hasDefeatedSurtr: true
    };
    localStorage.setItem(`nineRealms_ngplus_${gameState.currentSaveSlot}`, JSON.stringify(ngPlusData));
    
    // Reset to title screen
    elements.gameOverScreen.classList.add('hidden');
    elements.titleScreen.classList.remove('hidden');
    
    // Reset game state but keep New Game+ status
    resetGameState();
    gameState.newGamePlus = true;
    gameState.newGamePlusLevel = ngPlusData.newGamePlusLevel;
    gameState.hasDefeatedSurtr = true;
    
    // Update start button text
    elements.startBtn.textContent = `Begin New Game+ ${gameState.newGamePlusLevel}`;
    
    // Reload save slots to show New Game+ status
    loadSaveSlots();
}

// Apply New Game+ bonuses
function applyNewGamePlusBonuses() {
    const ngLevel = gameState.newGamePlusLevel;
    
    if (ngLevel > 0) {
        // Bonus starting resources
        const bonusResources = ngLevel * 50;
        gameState.resources += bonusResources;
        
        // Bonus starting Einherjar
        const bonusEinherjar = Math.floor(ngLevel * 2);
        gameState.einherjar.warriors += bonusEinherjar;
        gameState.einherjar.archers += bonusEinherjar;
        gameState.einherjar.shieldMaidens += bonusEinherjar;
        gameState.einherjar.total += bonusEinherjar * 3;
        
        // Improved resource generation for defended realms
        gameState.realms.forEach(realm => {
            if (realm.defended) {
                realm.resourcesPerSecond *= (1 + (ngLevel * 0.2));
            }
        });
        
        // Show New Game+ welcome message
        const ngPlusMessage = document.createElement('div');
        ngPlusMessage.classList.add('newgameplus-message');
        ngPlusMessage.innerHTML = `
            <h2>New Game+ ${ngLevel} Activated!</h2>
            <p><strong>Bonuses Received:</strong></p>
            <ul>
                <li>+${bonusResources} Starting Resources</li>
                <li>+${bonusEinherjar * 3} Starting Einherjar</li>
                <li>+${(ngLevel * 20)}% Resource Generation</li>
                <li>Reduced Enemy Threat Growth</li>
            </ul>
            <p>Your legend grows stronger with each victory!</p>
        `;
        ngPlusMessage.style.position = 'fixed';
        ngPlusMessage.style.top = '50%';
        ngPlusMessage.style.left = '50%';
        ngPlusMessage.style.transform = 'translate(-50%, -50%)';
        ngPlusMessage.style.backgroundColor = 'rgba(156, 39, 176, 0.95)';
        ngPlusMessage.style.padding = '20px';
        ngPlusMessage.style.borderRadius = '10px';
        ngPlusMessage.style.maxWidth = '600px';
        ngPlusMessage.style.textAlign = 'center';
        ngPlusMessage.style.zIndex = '1000';
        ngPlusMessage.style.border = '2px solid #9c27b0';
        ngPlusMessage.style.color = 'white';
        
        document.body.appendChild(ngPlusMessage);
        
        gsap.to(ngPlusMessage, {
            opacity: 0,
            delay: 6,
            duration: 1,
            onComplete: () => ngPlusMessage.remove()
        });
    }
}

// Reset game state to default values
function resetGameState() {
    gameState.day = 1;
    gameState.resources = 100;
    gameState.resourcesPerSecond = 0;
    gameState.lastResourceUpdate = Date.now();
    gameState.einherjar = {
        warriors: 0,
        archers: 0,
        shieldMaidens: 0,
        total: 0
    };
    gameState.selectedRealm = null;
    gameState.gameOver = false;
    gameState.surtrAttacked = false;
    gameState.victorious = false;
    
    // Don't reset New Game+ status unless explicitly starting fresh
    if (!gameState.newGamePlus) {
        gameState.newGamePlusLevel = 0;
        gameState.hasDefeatedSurtr = false;
    }
    
    // Reset realms
    gameState.realms.forEach(realm => {
        if (realm.id === 'asgard') {
            realm.threatLevel = 0;
            realm.defended = true;
            realm.underAttack = false;
        } else if (realm.id === 'muspelheim') {
            realm.threatLevel = 100;
            realm.defended = false;
            realm.underAttack = false;
        } else {
            realm.threatLevel = Math.floor(Math.random() * 30) + 20;
            realm.defended = false;
            realm.underAttack = true;
        }
    });
    
    renderRealms();
    updateResourcesPerSecond();
}

// Start resource gathering system
function startResourceGathering() {
    // Update resource counter every 100ms
    setInterval(() => {
        if (!gameState.gameOver) {
            const now = Date.now();
            const deltaTime = (now - gameState.lastResourceUpdate) / 1000; // Convert to seconds
            gameState.resources += gameState.resourcesPerSecond * deltaTime;
            gameState.lastResourceUpdate = now;
            
            // Update UI
            elements.resourceCount.textContent = Math.floor(gameState.resources);
            
            // Update training buttons based on resources
            updateTrainingButtons();
        }
    }, 100);
}

// Calculate resources per second based on defended realms
function updateResourcesPerSecond() {
    let totalRPS = 0;
    
    gameState.realms.forEach(realm => {
        if (realm.defended) {
            totalRPS += realm.resourcesPerSecond;
        }
    });
    
    gameState.resourcesPerSecond = totalRPS;
    
    // Update UI
    if (elements.resourcesPerSecond) {
        elements.resourcesPerSecond.textContent = totalRPS.toFixed(1);
    }
}

// Update the status of training buttons based on current resources
function updateTrainingButtons() {
    if (elements.trainWarriorBtn) {
        elements.trainWarriorBtn.disabled = gameState.resources < 10;
    }
    if (elements.trainArcherBtn) {
        elements.trainArcherBtn.disabled = gameState.resources < 15;
    }
    if (elements.trainShieldMaidenBtn) {
        elements.trainShieldMaidenBtn.disabled = gameState.resources < 20;
    }
}

// Visual effect for realm defense
function addRealmDefenseEffect(realmElement) {
    realmElement.classList.add('realm-defend-effect');
    setTimeout(() => {
        realmElement.classList.remove('realm-defend-effect');
    }, 2000);
}

// Visual effect for resource gain/loss
function addResourceEffect(amount) {
    const resourceCounter = document.getElementById('resource-count');
    const effectSpan = document.createElement('span');
    effectSpan.textContent = amount > 0 ? `+${amount}` : amount.toString();
    effectSpan.classList.add(amount > 0 ? 'resource-gain-effect' : 'resource-loss-effect');
    resourceCounter.appendChild(effectSpan);
    
    gsap.to(effectSpan, {
        opacity: 0,
        y: -20,
        duration: 1,
        onComplete: () => effectSpan.remove()
    });
}

// Visual effect for enemy invasion
function addInvasionEffect(realmElement) {
    realmElement.classList.add('realm-attack-effect');
    setTimeout(() => {
        realmElement.classList.remove('realm-attack-effect');
    }, 500);
}

// Add magical barrier effect when building defenses
function addMagicalBarrierEffect(realm) {
    const realmElement = document.querySelector(`.realm[data-id="${realm.id}"]`);
    if (realmElement) {
        const barrierEffect = document.createElement('div');
        barrierEffect.classList.add('magical-barrier-effect');
        realmElement.appendChild(barrierEffect);
        
        setTimeout(() => {
            barrierEffect.remove();
        }, 4000);
    }
}