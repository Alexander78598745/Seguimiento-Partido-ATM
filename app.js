// Análisis de Partidos - Atlético de Madrid (Fútbol Base)
// Aplicación completa para análisis de partidos de equipos base

// Lista de jugadores predefinidos del equipo base
const DEFAULT_PLAYERS = [
    { number: 5, fullName: "BLAGOEV MURIEL, JAIME RAFAEL", alias: "JAIME", position: "DEF" },
    { number: 11, fullName: "CARPINTERO MONGE", alias: "TELMO", position: "FWD" },
    { number: 2, fullName: "CHACON GARCIA, DIEGO", alias: "CHACON", position: "DEF" },
    { number: 20, fullName: "DA SILVA SECO, LEO SOCRATES", alias: "LEO", position: "FWD" },
    { number: 12, fullName: "DUMITRU, LUCA ANDREI", alias: "LUCA", position: "DEF" },
    { number: 6, fullName: "FUENTES IGLESIAS, MATEO", alias: "FUENTES", position: "MID" },
    { number: 17, fullName: "GARCIA LAVANGA", alias: "XAVI", position: "MID" },
    { number: 7, fullName: "GIL GARCÍA", alias: "JESÚS", position: "FWD" },
    { number: 22, fullName: "GONZÁLEZ VÁZQUEZ", alias: "ABRAHAM", position: "MID" },
    { number: 15, fullName: "JIMENEZ MARTINEZ", alias: "CARLOS", position: "DEF" },
    { number: 19, fullName: "MENU - MARQUE MORÓN", alias: "INTI", position: "FWD" },
    { number: 18, fullName: "MERINO GARCIA, RAFAEL", alias: "RAFA", position: "DEF" },
    { number: 9, fullName: "MOLINA BAYO, JUAN", alias: "JUANITO", position: "FWD" },
    { number: 4, fullName: "PERALVO FERNANDEZ", alias: "DAVID", position: "DEF" },
    { number: 13, fullName: "REDONDO ROMERO, FRANCISCO", alias: "FRAN", position: "GK" },
    { number: 8, fullName: "ROMERO GONZÁLEZ", alias: "HUGO", position: "MID" },
    { number: 1, fullName: "SANTIAGO DEL AGUILA", alias: "JORGE", position: "GK" },
    { number: 3, fullName: "SANTOS PASCUAL", alias: "TIAGO", position: "DEF" },
    { number: 16, fullName: "VOLTAS LOPEZ, LUCAS", alias: "VOLTAS", position: "DEF" },
    { number: 10, fullName: "YUNTA DELGADO", alias: "OMAR", position: "MID" },
    { number: 14, fullName: "ZANZI AWUDU, FAWAZ SEIDU", alias: "FAWAZ", position: "FWD" },
    { number: 21, fullName: "SKIBA", alias: "ARTUR", position: "MID" }
];

class MatchAnalyzer {
    constructor() {
        this.matchData = {
            startTime: null,
            currentTime: 0,
            isRunning: false,
            period: 'pre', // pre, first, halftime, second, finished
            homeScore: 0,
            awayScore: 0,
            events: [],
            substitutions: 0,
            firstHalfDuration: 0, // Duración real del primer tiempo en segundos
            originalStarters: [] // MODIFICACIÓN 2: Guardar titulares originales
        };

        this.players = JSON.parse(localStorage.getItem('atletico_base_players')) || [];
        this.selectedPlayer = null;
        this.selectedSubstitute = null;
        this.draggedPlayer = null;
        this.currentTab = 'default';
        
        // Variables para control de event listeners
        this.otherModalsConfigured = false;
        this.modalClickHandler = null;
        
        this.init();
    }

    init() {
        // CRÍTICO: Limpiar localStorage para evitar jugadores predeterminados
        this.clearPredeterminedPlayers();
        
        this.setupEventListeners();
        this.setupVisibilityHandlers(); // Nuevo: manejo de visibilidad
        this.renderPlayers();
        this.setupDefaultMatch();
        this.updateTimelineDisplay();
        this.updateGoalDisplays();
        
        // CRÍTICO: Configurar event listeners de modales UNA SOLA VEZ al inicio
        this.setupModalEventListeners();
        
        // Inicializar cronología vacía
        console.log('Aplicación inicializada. Eventos actuales:', this.matchData.events.length);
        
        // Si no hay jugadores, mostrar mensaje informativo
        if (this.players.length === 0) {
            setTimeout(() => {
                alert('¡Bienvenido! Para empezar, carga la plantilla base del equipo haciendo clic en "Cargar Plantilla Base".');
            }, 500);
        }
    }

    setupEventListeners() {
        // Controles del partido
        document.getElementById('startMatch').addEventListener('click', () => this.startMatch());
        document.getElementById('endFirstHalf').addEventListener('click', () => this.endFirstHalf());
        document.getElementById('startSecondHalf').addEventListener('click', () => this.startSecondHalf());
        document.getElementById('endMatch').addEventListener('click', () => this.endMatch());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());
        document.getElementById('newMatch').addEventListener('click', () => this.newMatch());

        // Controles de goles
        document.getElementById('addHomeGoal').addEventListener('click', () => this.addGoal('home'));
        document.getElementById('removeHomeGoal').addEventListener('click', () => this.removeGoal('home'));
        document.getElementById('addAwayGoal').addEventListener('click', () => this.addGoal('away'));
        document.getElementById('removeAwayGoal').addEventListener('click', () => this.removeGoal('away'));

        // Gestión de jugadores - Tabs
        document.getElementById('loadDefaultPlayersBtn').addEventListener('click', () => this.switchTab('default'));
        document.getElementById('selectStartersBtn').addEventListener('click', () => this.switchTab('starters'));
        document.getElementById('addCustomPlayerBtn').addEventListener('click', () => this.switchTab('add'));
        document.getElementById('editPlayerBtn').addEventListener('click', () => this.switchTab('edit'));
        document.getElementById('uncalledPlayersBtn').addEventListener('click', () => this.switchTab('uncalled'));

        // Gestión de jugadores - Acciones
        document.getElementById('confirmAddPlayer').addEventListener('click', () => this.addNewPlayer());
        document.getElementById('confirmEditPlayer').addEventListener('click', () => this.savePlayerEdit());
        document.getElementById('selectPlayerToEdit').addEventListener('change', (e) => this.loadPlayerForEdit(e.target.value));
        document.getElementById('confirmStarters').addEventListener('click', () => this.confirmStartingLineup());
        document.getElementById('saveUncalledPlayers').addEventListener('click', () => this.saveUncalledPlayers());

        // Información del partido
        document.getElementById('rivalName').addEventListener('input', (e) => {
            document.getElementById('awayTeamName').textContent = e.target.value || 'RIVAL';
        });

        // Fecha por defecto
        document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
    }

    // Método para prevenir reinicios accidentales sin pausar el cronómetro
    setupVisibilityHandlers() {
        // Prevenir recargas accidentales durante partidos activos
        window.addEventListener('beforeunload', (e) => {
            if (this.matchData.isRunning || this.matchData.events.length > 0) {
                e.preventDefault();
                e.returnValue = '¿Estás seguro de que quieres salir? Se perderán los datos del partido actual.';
                return e.returnValue;
            }
        });

        // Cuando la página vuelve a ser visible, actualizar inmediatamente el cronómetro
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.matchData.isRunning) {
                console.log('Página restaurada - actualizando cronómetro inmediatamente');
                // Forzar una actualización inmediata al volver a ser visible
                this.updateMatchTimer();
            }
        });
    }

    setupModalEventListeners() {
        console.log('=== CONFIGURANDO EVENT LISTENERS - SISTEMA SIMPLIFICADO ===');
        
        // MÉTODO SIMPLE: Agregar listener a cada botón individualmente
        const actionButtons = document.querySelectorAll('.action-option');
        console.log('Botones de acción encontrados:', actionButtons.length);
        
        if (actionButtons.length === 0) {
            console.error('ERROR CRÍTICO: No se encontraron botones de acción');
            return;
        }
        
        // Remover listeners existentes y agregar nuevos a cada botón
        actionButtons.forEach((button, index) => {
            const action = button.dataset.action;
            console.log(`Configurando botón ${index + 1}: ${action}`);
            
            if (!action) {
                console.error(`ERROR: Botón ${index + 1} no tiene data-action`);
                return;
            }
            
            // Remover listener existente si lo hay
            button.removeEventListener('click', button._actionHandler);
            
            // Crear nuevo handler específico
            button._actionHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('=== CLICK DETECTADO EN BOTÓN ===');
                console.log('Acción del botón:', action);
                console.log('Jugador actualmente seleccionado:', this.selectedPlayer?.alias || 'NINGUNO');
                
                // Llamar directamente a la función con el action
                this.handlePlayerAction(action);
            };
            
            // Agregar el nuevo listener
            button.addEventListener('click', button._actionHandler);
            
            console.log(`✓ Botón ${action} configurado exitosamente`);
        });
        
        // Configurar otros modales (una sola vez)
        if (!this.otherModalsConfigured) {
            this.setupOtherModalListeners();
        }
        
        console.log('=== EVENT LISTENERS CONFIGURADOS EXITOSAMENTE ===');
    }
    
    setupOtherModalListeners() {
        // Solo configurar si no están ya configurados
        if (!this.otherModalsConfigured) {
            // Modal de gol
            document.getElementById('confirmGoal').addEventListener('click', () => this.confirmGoal());
            document.getElementById('cancelGoal').addEventListener('click', () => this.closeModal('goalModal'));

            // Modal de cambio
            document.getElementById('confirmSubstitution').addEventListener('click', () => this.confirmSubstitution());
            document.getElementById('cancelSubstitution').addEventListener('click', () => this.closeModal('substitutionModal'));

            // Modal de tarjeta
            document.getElementById('confirmCard').addEventListener('click', () => this.confirmCard());
            document.getElementById('cancelCard').addEventListener('click', () => this.closeModal('cardModal'));

            // Modal de tarjeta amarilla rival
            document.getElementById('confirmRivalCard').addEventListener('click', () => this.confirmRivalCard());
            document.getElementById('cancelRivalCard').addEventListener('click', () => this.closeModal('rivalCardModal'));

            // Cerrar otros modales al hacer clic fuera
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.id !== 'playerActionsModal') {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.closeModal(modal.id);
                        }
                    });
                }
            });
            
            this.otherModalsConfigured = true;
            console.log('✓ Otros modales configurados');
        }
    }

    setupDefaultMatch() {
        document.getElementById('matchVenue').value = '';
        document.getElementById('homeAway').value = 'local';
        document.getElementById('category').value = 'ALEVIN B F11';
        document.getElementById('matchDay').value = '';
    }
    
    // Actualizar displays de goles
    updateGoalDisplays() {
        document.getElementById('homeGoalDisplay').textContent = this.matchData.homeScore;
        document.getElementById('awayGoalDisplay').textContent = this.matchData.awayScore;
    }

    // Control del partido
    startMatch() {
        const starters = this.players.filter(p => p.isStarter && !p.isUncalled);
        if (starters.length === 0) {
            alert('Debes seleccionar y confirmar titulares antes de iniciar el partido.');
            return;
        }
        
        console.log(`Iniciando partido con ${starters.length} titulares:`);
        
        // MODIFICACIÓN 2: Guardar titulares originales para el PDF
        this.matchData.originalStarters = starters.map(player => ({
            number: player.number,
            alias: player.alias,
            fullName: player.fullName,
            position: player.position
        }));
        
        // Inicializar entryMinute y datos para todos los titulares
        starters.forEach(player => {
            player.entryMinute = 0;
            player.minutesPlayed = 0;
            player.previousMinutes = 0;
            player.exitMinute = null;
            player.enteredDuringHalftime = false; // Titulares no entran en descanso
            console.log(`Titular ${player.alias} inicializado: entry=0, played=0, prev=0`);
        });
        
        this.matchData.startTime = new Date();
        this.matchData.isRunning = true;
        this.matchData.period = 'first';
        
        this.updateMatchTimer();
        this.updateControls();
        this.updatePeriodDisplay('1er Tiempo');
        this.addTimelineEvent('start_match', 'INICIO DEL PARTIDO', '', 0);
        
        console.log('Partido iniciado correctamente');
    }

    endFirstHalf() {
        // Guardar la duración real del primer tiempo
        this.matchData.firstHalfDuration = this.matchData.currentTime;
        this.matchData.isRunning = false;
        this.matchData.period = 'halftime';
        this.updateControls();
        this.updatePeriodDisplay('Descanso');
        
        const minutes = Math.floor(this.matchData.firstHalfDuration / 60);
        const seconds = this.matchData.firstHalfDuration % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.addTimelineEvent('end_first_half', `FINAL PRIMER TIEMPO (${timeStr})`, '', minutes);
        
        console.log(`Primer tiempo finalizado - Duración real: ${this.matchData.firstHalfDuration} segundos (${timeStr})`);
    }

    startSecondHalf() {
        this.matchData.isRunning = true;
        this.matchData.period = 'second';
        // CORRECCIÓN: Configurar startTime para continuar desde donde terminó el primer tiempo
        this.matchData.currentTime = this.matchData.firstHalfDuration;
        this.matchData.startTime = new Date() - (this.matchData.firstHalfDuration * 1000);
        this.updateMatchTimer();
        this.updateControls();
        this.updatePeriodDisplay('2do Tiempo');
        const secondHalfStartMinute = Math.floor(this.matchData.firstHalfDuration / 60);
        this.addTimelineEvent('start_second_half', 'INICIO SEGUNDO TIEMPO', '', secondHalfStartMinute);
        
        console.log(`Segundo tiempo iniciado - Continuando desde: ${this.matchData.firstHalfDuration} segundos (${secondHalfStartMinute} minutos)`);
    }

    endMatch() {
        this.matchData.isRunning = false;
        this.matchData.period = 'finished';
        this.updateControls();
        this.updatePeriodDisplay('Finalizado');
        const firstHalf = this.matchData.firstHalfDuration || 0;
        const secondHalf = this.matchData.secondHalfDuration || 0;
        const totalMatchMinutes = Math.floor((firstHalf + secondHalf) / 60);
        this.addTimelineEvent('end_match', 'FINAL DEL PARTIDO', '', totalMatchMinutes);
        document.getElementById('exportPDF').disabled = false;
    }

    newMatch() {
        if (confirm('¿Estás seguro de que quieres iniciar un nuevo partido? Se perderán todos los datos del partido actual.')) {
            // Reset de datos del partido
            this.matchData = {
                startTime: null,
                currentTime: 0,
                isRunning: false,
                period: 'pre',
                homeScore: 0,
                awayScore: 0,
                events: [],
                substitutions: 0,
                firstHalfDuration: 0,
                originalStarters: [] // MODIFICACIÓN 2: Reset titulares originales
            };

            // Reset de jugadores
            this.players.forEach(player => {
                player.isStarter = false;
                player.minutesPlayed = 0;
                player.entryMinute = null;
                player.exitMinute = null;
                player.isUncalled = false;
                player.previousMinutes = 0; // Para fútbol base
                player.enteredDuringHalftime = false; // Reset marca de descanso
            });

            // Reset de interfaz
            document.getElementById('homeScore').textContent = '0';
            document.getElementById('awayScore').textContent = '0';
            document.getElementById('homeGoalDisplay').textContent = '0';
            document.getElementById('awayGoalDisplay').textContent = '0';
            document.getElementById('matchTimer').textContent = '00:00';
            document.getElementById('matchPeriod').textContent = 'Pre-partido';

            // Reset de controles
            this.updateControls();
            this.updateGoalDisplays();
            this.updateTimelineDisplay();

            // Reset de campos
            document.getElementById('rivalName').value = '';
            document.getElementById('matchVenue').value = '';
            document.getElementById('matchDay').value = '';
            
            // Renderizar todo de nuevo
            this.renderPlayers();

            alert('¡Nuevo partido iniciado! Todos los datos han sido restablecidos.');
        }
    }

    updateMatchTimer() {
        if (!this.matchData.isRunning) return;

        const now = new Date();
        let elapsed = Math.floor((now - this.matchData.startTime) / 1000);
        
        if (this.matchData.period === 'second') {
            // Usar la duración real del primer tiempo como mínimo para el segundo tiempo
            elapsed = Math.max(elapsed, this.matchData.firstHalfDuration);
        }
        
        this.matchData.currentTime = elapsed;

        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('matchTimer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.updatePlayersMinutes();

        setTimeout(() => this.updateMatchTimer(), 1000);
    }

    updatePlayersMinutes() {
        if (!this.matchData.isRunning) return;
        
        const currentMinute = Math.floor(this.matchData.currentTime / 60);
        let updatesCount = 0;
        
        this.players.forEach(player => {
            // Solo actualizar minutos para jugadores que están actualmente en el campo
            if (player.isStarter && !player.isUncalled && (player.exitMinute === null || player.exitMinute === undefined)) {
                let newTotal = 0;
                
                // LÓGICA CORREGIDA: Calcular el total correcto
                const previousMinutes = player.previousMinutes || 0; // Minutos de partidos/períodos anteriores
                
                if (player.entryMinute === null || player.entryMinute === 0 || player.entryMinute === undefined) {
                    // Titular desde inicio: cuenta desde minuto 0
                    newTotal = currentMinute;
                } else {
                    // Jugador que entró por cambio
                    if (player.enteredDuringHalftime) {
                        // Cambio en descanso: solo cuenta desde inicio segundo tiempo + minutos previos
                        if (this.matchData.period === 'second') {
                            const firstHalfMinutes = Math.floor(this.matchData.firstHalfDuration / 60);
                            const minutesInSecondHalf = Math.max(0, currentMinute - firstHalfMinutes);
                            newTotal = previousMinutes + minutesInSecondHalf;
                        } else {
                            // Estamos en primer tiempo o descanso, solo cuenta minutos previos
                            newTotal = previousMinutes;
                        }
                    } else {
                        // Cambio normal: cuenta desde minuto de entrada + minutos previos
                        const minutesSinceEntry = Math.max(0, currentMinute - player.entryMinute);
                        newTotal = previousMinutes + minutesSinceEntry;
                    }
                }
                
                // Solo actualizar si cambió
                if (player.minutesPlayed !== newTotal) {
                    player.minutesPlayed = newTotal;
                    updatesCount++;
                    
                    // Logging solo para cambios significativos
                    if (currentMinute % 5 === 0) {
                        console.log(`Minutos ${player.alias}: prev=${previousMinutes}, entrada=${player.entryMinute}, current=${currentMinute}, total=${newTotal}`);
                    }
                }
            }
            // Si el jugador ya fue sustituido (exitMinute tiene valor), 
            // sus minutos se congelaron al momento del cambio
        });
        
        // Solo re-renderizar si hubo actualizaciones reales
        if (updatesCount > 0) {
            this.renderPlayersOnField();
        }
    }

    updateControls() {
        const buttons = {
            startMatch: document.getElementById('startMatch'),
            endFirstHalf: document.getElementById('endFirstHalf'),
            startSecondHalf: document.getElementById('startSecondHalf'),
            endMatch: document.getElementById('endMatch'),
            exportPDF: document.getElementById('exportPDF')
        };

        // Resetear todos
        Object.values(buttons).forEach(btn => btn.disabled = true);

        switch (this.matchData.period) {
            case 'pre':
                buttons.startMatch.disabled = false;
                break;
            case 'first':
                buttons.endFirstHalf.disabled = false;
                break;
            case 'halftime':
                buttons.startSecondHalf.disabled = false;
                break;
            case 'second':
                buttons.endMatch.disabled = false;
                break;
            case 'finished':
                buttons.exportPDF.disabled = false;
                break;
        }
    }

    updatePeriodDisplay(period) {
        document.getElementById('matchPeriod').textContent = period;
    }

    // Controles de goles - CRONOLOGIA COMPLETAMENTE CORREGIDA
    addGoal(team) {
        const currentMinute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
        
        if (team === 'home') {
            this.matchData.homeScore++;
            document.getElementById('homeScore').textContent = this.matchData.homeScore;
            document.getElementById('homeGoalDisplay').textContent = this.matchData.homeScore;
            
            // CRÍTICO: Formato limpio y consistente para goles a favor
            const description = `${currentMinute.toString().padStart(2, '0')}' - GOL DE ATLETICO DE MADRID`;
            this.addTimelineEvent('goal_home', description, '');
            
            console.log('✓ Gol a favor registrado correctamente:', description);
        } else {
            this.matchData.awayScore++;
            document.getElementById('awayScore').textContent = this.matchData.awayScore;
            document.getElementById('awayGoalDisplay').textContent = this.matchData.awayScore;
            
            // Gol del rival con formato consistente
            const rival = document.getElementById('rivalName').value || 'RIVAL';
            const description = `${currentMinute.toString().padStart(2, '0')}' - GOL DE ${rival.toUpperCase()}`;
            this.addTimelineEvent('goal_away', description, '');
            
            console.log('✓ Gol del rival registrado correctamente:', description);
        }
        
        // Actualizar displays inmediatamente
        this.updateGoalDisplays();
        
        console.log('=== ESTADO ACTUALIZADO ===');
        console.log('Marcador - Local:', this.matchData.homeScore, 'Visitante:', this.matchData.awayScore);
        console.log('Total eventos en cronología:', this.matchData.events.length);
    }

    removeGoal(team) {
        if (team === 'home' && this.matchData.homeScore > 0) {
            this.matchData.homeScore--;
            document.getElementById('homeScore').textContent = this.matchData.homeScore;
            document.getElementById('homeGoalDisplay').textContent = this.matchData.homeScore;
            
            // Crear evento para la cronología
            const minute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
            const description = `GOL ANULADO - Atlético de Madrid`;
            this.addTimelineEvent('goal_cancelled', description, '');
        } else if (team === 'away' && this.matchData.awayScore > 0) {
            this.matchData.awayScore--;
            document.getElementById('awayScore').textContent = this.matchData.awayScore;
            document.getElementById('awayGoalDisplay').textContent = this.matchData.awayScore;
            
            // Crear evento para la cronología
            const rival = document.getElementById('rivalName').value || 'RIVAL';
            const minute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
            const description = `GOL ANULADO - ${rival}`;
            this.addTimelineEvent('goal_cancelled', description, '');
        }
        
        console.log('Gol eliminado, eventos actuales:', this.matchData.events);
    }

    // Gestión de tabs
    switchTab(tab) {
        // Actualizar estados de los tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        const forms = {
            'starterSelection': document.getElementById('starterSelection'),
            'customPlayerForm': document.getElementById('customPlayerForm'),
            'editPlayerForm': document.getElementById('editPlayerForm'),
            'uncalledPlayersManagement': document.getElementById('uncalledPlayersManagement')
        };
        
        // Ocultar todos los formularios
        Object.values(forms).forEach(form => form.style.display = 'none');
        
        this.currentTab = tab;
        
        switch (tab) {
            case 'default':
                document.getElementById('loadDefaultPlayersBtn').classList.add('active');
                this.loadDefaultPlayers();
                break;
            case 'starters':
                document.getElementById('selectStartersBtn').classList.add('active');
                forms.starterSelection.style.display = 'grid';
                this.showStarterSelection();
                break;
            case 'add':
                document.getElementById('addCustomPlayerBtn').classList.add('active');
                forms.customPlayerForm.style.display = 'grid';
                break;
            case 'edit':
                document.getElementById('editPlayerBtn').classList.add('active');
                forms.editPlayerForm.style.display = 'grid';
                this.updateEditPlayerSelect();
                break;
            case 'uncalled':
                document.getElementById('uncalledPlayersBtn').classList.add('active');
                forms.uncalledPlayersManagement.style.display = 'block';
                this.showUncalledPlayersManagement();
                break;
        }
    }

    // FUNCIÓN CRÍTICA: Limpiar jugadores predeterminados
    clearPredeterminedPlayers() {
        console.log('=== LIMPIANDO JUGADORES PREDETERMINADOS ===');
        
        // Si hay jugadores en localStorage, asegurar que no sean predeterminados
        if (this.players.length > 0) {
            this.players.forEach(player => {
                if (player.isStarter === true || player.isUncalled === true) {
                    console.log(`Corrigiendo jugador predeterminado: ${player.alias}`);
                    player.isStarter = false;
                    player.isUncalled = false;
                    player.minutesPlayed = 0;
                    player.entryMinute = null;
                    player.exitMinute = null;
                }
            });
            this.savePlayersToStorage();
            console.log('Jugadores predeterminados corregidos');
        }
    }
    
    // Cargar jugadores predefinidos
    loadDefaultPlayers() {
        if (this.players.length > 0) {
            const confirm = window.confirm('¿Estás seguro de que quieres cargar la plantilla base? Esto reemplazará todos los jugadores actuales.');
            if (!confirm) return;
        }
        
        // CRÍTICO: Asegurar que NINGÚN jugador es predeterminado
        this.players = DEFAULT_PLAYERS.map(player => ({
            id: Date.now() + Math.random(),
            name: player.fullName,
            alias: player.alias,
            number: player.number,
            position: player.position,
            isStarter: false,        // GARANTIZAR: NO titulares predeterminados
            isUncalled: false,       // GARANTIZAR: NO desconvocados predeterminados 
            minutesPlayed: 0,
            entryMinute: null,
            exitMinute: null,
            x: 50,  // Posición neutral
            y: 50   // Posición neutral
        }));
        
        this.renderPlayers();
        this.savePlayersToStorage();
        
        // Mensaje claro sobre el estado
        alert(`¡Plantilla base cargada!

📋 ${this.players.length} jugadores DISPONIBLES
⚽ NINGUNO es titular automáticamente
❌ NINGUNO está desconvocado

👉 TÚ ELIGES quién va en cada lista`);
        
        console.log('=== PLANTILLA CARGADA - VERIFICACIÓN ===');
        this.players.forEach(p => {
            console.log(`${p.number}-${p.alias}: Starter=${p.isStarter}, Uncalled=${p.isUncalled}`);
        });
    }

    // Sistema de selección de titulares
    showStarterSelection() {
        this.selectedStarters = [];
        this.renderAvailablePlayers();
        this.renderSelectedStarters();
    }

    renderAvailablePlayers() {
        const container = document.getElementById('availablePlayersList');
        container.innerHTML = '';
        
        const availablePlayers = this.players.filter(p => !p.isStarter && !p.isUncalled);
        
        // Ordenar jugadores por dorsal (menor a mayor)
        availablePlayers.sort((a, b) => a.number - b.number);
        
        availablePlayers.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playerCard.addEventListener('click', () => this.selectPlayerForStarting(player));
            container.appendChild(playerCard);
        });
    }

    renderSelectedStarters() {
        const container = document.getElementById('selectedStartersList');
        container.innerHTML = '';
        
        const starters = this.players.filter(p => p.isStarter);
        
        // Ordenar titulares por dorsal (menor a mayor)
        starters.sort((a, b) => a.number - b.number);
        
        starters.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playerCard.classList.add('selected');
            playerCard.addEventListener('click', () => this.unselectStarterPlayer(player));
            container.appendChild(playerCard);
        });
        
        // Actualizar contador
        const starterCount = starters.length;
        document.getElementById('starterCount').textContent = starterCount;
        
        // Habilitar/deshabilitar botón
        const confirmBtn = document.getElementById('confirmStarters');
        confirmBtn.disabled = starterCount !== 11;
    }

    createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="number">#${player.number}</div>
            <div class="name">${player.alias}</div>
            <div class="position">${this.getPositionName(player.position)}</div>
        `;
        return card;
    }

    selectPlayerForStarting(player) {
        const currentStarters = this.players.filter(p => p.isStarter).length;
        if (currentStarters >= 11) {
            alert('Ya tienes 11 titulares seleccionados. Quita alguno primero.');
            return;
        }
        
        player.isStarter = true;
        player.entryMinute = 0;
        player.minutesPlayed = 0;
        
        // Posición por defecto en el campo
        const defaultPos = this.getDefaultPosition(player.position);
        player.x = defaultPos.x;
        player.y = defaultPos.y;
        
        this.renderAvailablePlayers();
        this.renderSelectedStarters();
    }

    unselectStarterPlayer(player) {
        player.isStarter = false;
        player.entryMinute = null;
        player.minutesPlayed = 0;
        
        this.renderAvailablePlayers();
        this.renderSelectedStarters();
    }

    confirmStartingLineup() {
        console.log('=== DEBUG: Estado de jugadores ANTES de confirmar alineación ===');
        this.players.forEach(p => {
            console.log(`${p.number}-${p.alias}: Starter:${p.isStarter}, Uncalled:${p.isUncalled}`);
        });
        
        const starters = this.players.filter(p => p.isStarter);
        if (starters.length !== 11) {
            alert('Debes seleccionar exactamente 11 jugadores titulares.');
            return;
        }
        
        console.log('Confirmando alineación con jugadores:', starters.map(p => `${p.number}-${p.alias}`));
        
        // Colocar jugadores en posición central neutral para que el usuario los mueva manualmente
        let row = 0;
        let col = 0;
        starters.forEach((player, index) => {
            // Posicionar en una grilla 3x4 (sin posiciones predeterminadas por posición)
            row = Math.floor(index / 3);
            col = index % 3;
            
            // Distribución en grilla centrada
            player.x = 25 + (col * 25); // 25%, 50%, 75%
            player.y = 20 + (row * 15); // 20%, 35%, 50%, 65%
            
            // Asegurar que tienen los datos necesarios para el campo
            player.entryMinute = 0;
            player.minutesPlayed = 0;
            player.exitMinute = null;
            player.previousMinutes = 0; // Para fútbol base
            console.log(`Titular ${player.alias}: pos(${player.x}, ${player.y}), starter: ${player.isStarter}`);
        });
        
        // CRÍTICO: Limpiar completamente el campo antes de renderizar
        const fieldContainer = document.getElementById('playersOnField');
        if (fieldContainer) {
            fieldContainer.innerHTML = '';
        }
        
        // Esperar un momento y forzar renderizado completo
        setTimeout(() => {
            console.log('Ejecutando renderizado después de timeout...');
            this.renderPlayersOnField();
            this.renderSubstitutes();
            
            // Verificar que se renderizaron los jugadores
            const renderedPlayers = document.getElementById('playersOnField').children.length;
            console.log(`Jugadores renderizados en campo: ${renderedPlayers}`);
            
            if (renderedPlayers === 0) {
                console.error('ERROR: No se renderizó ningún jugador en el campo');
                // Intentar renderizado adicional
                setTimeout(() => {
                    this.renderPlayersOnField();
                }, 200);
            }
        }, 150);
        
        this.savePlayersToStorage();
        
        console.log('=== DEBUG: Estado de jugadores DESPUÉS de confirmar alineación ===');
        this.players.forEach(p => {
            console.log(`${p.number}-${p.alias}: Starter:${p.isStarter}, Uncalled:${p.isUncalled}`);
        });
        
        // NO cambiar de tab - mantener el estado actual para preservar los datos
        // Solo ocultar el formulario de selección de titulares
        document.getElementById('starterSelection').style.display = 'none';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        alert(`¡Alineación confirmada! Los ${starters.length} titulares están en el campo. 

🖱️ Puedes MOVER los jugadores arrastrándolos por el campo
🎯 Puedes hacer CLIC en un jugador para registrar acciones (gol, tarjeta, cambio)`);
    }

    // Sistema de gestión de jugadores desconvocados
    showUncalledPlayersManagement() {
        // Asegurar que no hay desconvocados predeterminados
        this.players.forEach(player => {
            if (player.isUncalled === undefined) {
                player.isUncalled = false;
            }
        });
        
        this.renderAvailableForUncalled();
        this.renderUncalledPlayers();
    }

    renderAvailableForUncalled() {
        const container = document.getElementById('availableForUncalledList');
        container.innerHTML = '';
        
        const availablePlayers = this.players.filter(p => !p.isUncalled);
        
        // Ordenar jugadores por dorsal (menor a mayor)
        availablePlayers.sort((a, b) => a.number - b.number);
        
        availablePlayers.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playerCard.addEventListener('click', () => this.setPlayerAsUncalled(player));
            container.appendChild(playerCard);
        });
    }

    renderUncalledPlayers() {
        const container = document.getElementById('uncalledPlayersList');
        container.innerHTML = '';
        
        const uncalledPlayers = this.players.filter(p => p.isUncalled);
        
        // Ordenar jugadores por dorsal (menor a mayor)
        uncalledPlayers.sort((a, b) => a.number - b.number);
        
        uncalledPlayers.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playerCard.classList.add('uncalled');
            playerCard.addEventListener('click', () => this.removePlayerFromUncalled(player));
            container.appendChild(playerCard);
        });
    }

    setPlayerAsUncalled(player) {
        // Si es titular, quitarlo de titulares
        if (player.isStarter) {
            player.isStarter = false;
            player.entryMinute = null;
            player.minutesPlayed = 0;
        }
        
        player.isUncalled = true;
        
        this.renderAvailableForUncalled();
        this.renderUncalledPlayers();
        this.renderPlayers();
        this.savePlayersToStorage();
    }

    removePlayerFromUncalled(player) {
        player.isUncalled = false;
        
        this.renderAvailableForUncalled();
        this.renderUncalledPlayers();
        this.renderPlayers();
        this.savePlayersToStorage();
    }

    saveUncalledPlayers() {
        const uncalledPlayers = this.players.filter(p => p.isUncalled);
        this.savePlayersToStorage();
        
        if (uncalledPlayers.length > 0) {
            alert(`Lista de desconvocados guardada exitosamente. ${uncalledPlayers.length} jugador(es) desconvocado(s).`);
        } else {
            alert('No hay jugadores desconvocados para guardar.');
        }
    }

    // Actualizar selector de edición
    updateEditPlayerSelect() {
        const select = document.getElementById('selectPlayerToEdit');
        select.innerHTML = '<option value="">Seleccionar jugador...</option>';
        
        this.players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `#${player.number} - ${player.alias} (${this.getPositionName(player.position)})`;
            select.appendChild(option);
        });
    }

    // Cargar jugador para editar
    loadPlayerForEdit(playerId) {
        if (!playerId) {
            this.clearEditForm();
            return;
        }
        
        const player = this.players.find(p => p.id == playerId);
        if (!player) return;
        
        document.getElementById('editPlayerName').value = player.name;
        document.getElementById('editPlayerAlias').value = player.alias;
        document.getElementById('editPlayerNumber').value = player.number;
        document.getElementById('editPlayerPosition').value = player.position;
    }

    // Limpiar formulario de edición
    clearEditForm() {
        document.getElementById('editPlayerName').value = '';
        document.getElementById('editPlayerAlias').value = '';
        document.getElementById('editPlayerNumber').value = '';
        document.getElementById('editPlayerPosition').value = 'DEF';
    }

    // Guardar edición de jugador
    savePlayerEdit() {
        const playerId = document.getElementById('selectPlayerToEdit').value;
        if (!playerId) {
            alert('Selecciona un jugador para editar');
            return;
        }
        
        const player = this.players.find(p => p.id == playerId);
        if (!player) return;
        
        const newName = document.getElementById('editPlayerName').value.trim();
        const newAlias = document.getElementById('editPlayerAlias').value.trim();
        const newNumber = parseInt(document.getElementById('editPlayerNumber').value);
        const newPosition = document.getElementById('editPlayerPosition').value;
        
        if (!newName || !newAlias || !newNumber || !newPosition) {
            alert('Completa todos los campos');
            return;
        }
        
        // Verificar que el número no esté en uso por otro jugador
        const numberInUse = this.players.some(p => p.id != playerId && p.number === newNumber);
        if (numberInUse) {
            alert('Este dorsal ya está en uso por otro jugador');
            return;
        }
        
        // Actualizar jugador
        player.name = newName;
        player.alias = newAlias;
        player.number = newNumber;
        player.position = newPosition;
        
        // Si cambio de posición, actualizar posición en el campo
        if (player.position !== newPosition) {
            const newPos = this.getDefaultPosition(newPosition);
            player.x = newPos.x;
            player.y = newPos.y;
        }
        
        this.renderPlayers();
        this.savePlayersToStorage();
        this.updateEditPlayerSelect();
        alert('Jugador actualizado correctamente');
    }

    // Gestión de jugadores
    addNewPlayer() {
        const name = document.getElementById('playerName').value.trim();
        const alias = document.getElementById('playerAlias').value.trim();
        const number = parseInt(document.getElementById('playerNumber').value);
        const position = document.getElementById('playerPosition').value;

        if (!name || !alias || !number || !position) {
            alert('Completa todos los campos');
            return;
        }

        if (this.players.some(p => p.number === number)) {
            alert('Este dorsal ya está en uso');
            return;
        }

        const newPlayer = {
            id: Date.now(),
            name: name,
            alias: alias,
            number: number,
            position: position,
            isStarter: false,
            isUncalled: false,
            minutesPlayed: 0,
            entryMinute: null,
            exitMinute: null,
            x: this.getDefaultPosition(position).x,
            y: this.getDefaultPosition(position).y
        };

        this.players.push(newPlayer);
        this.renderPlayers();
        this.savePlayersToStorage();

        // Limpiar formulario
        document.getElementById('playerName').value = '';
        document.getElementById('playerAlias').value = '';
        document.getElementById('playerNumber').value = '';
    }

    getDefaultPosition(position) {
        const positions = {
            'GK': { x: 15, y: 50 },
            'DEF': { x: 30, y: 25 + (Math.random() * 50) },
            'MID': { x: 50, y: 25 + (Math.random() * 50) },
            'FWD': { x: 75, y: 25 + (Math.random() * 50) }
        };
        return positions[position] || { x: 50, y: 50 };
    }

    // Renderizado
    renderPlayers() {
        this.renderPlayersOnField();
        this.renderSubstitutes();
    }

    renderPlayersOnField() {
        const container = document.getElementById('playersOnField');
        if (!container) {
            console.error('ERROR CRÍTICO: Container playersOnField no encontrado');
            return;
        }
        
        // Limpiar completamente el contenedor
        container.innerHTML = '';

        const starters = this.players.filter(p => p.isStarter && !p.isUncalled);
        
        console.log(`Renderizando ${starters.length} jugadores titulares en campo:`);
        starters.forEach(p => console.log(`- ${p.number}: ${p.alias} (${p.position}) - Starter: ${p.isStarter}, Uncalled: ${p.isUncalled}`));
        
        if (starters.length === 0) {
            console.log('No hay titulares para renderizar en el campo');
            return;
        }
        
        starters.forEach((player, index) => {
            // Asegurar que el jugador tiene posiciones válidas
            if (!player.x || !player.y || player.x === 0 || player.y === 0) {
                const defaultPos = this.getDefaultPosition(player.position);
                player.x = defaultPos.x;
                player.y = defaultPos.y;
                console.log(`Posición corregida para ${player.alias}: x=${player.x}, y=${player.y}`);
            }
            
            try {
                const playerElement = this.createPlayerElement(player);
                container.appendChild(playerElement);
                console.log(`✓ Jugador ${player.alias} (#${player.number}) añadido al campo en posición (${player.x}%, ${player.y}%)`);
            } catch (error) {
                console.error(`Error al crear elemento para jugador ${player.alias}:`, error);
            }
        });
        
        const finalCount = container.children.length;
        console.log(`RESULTADO: ${finalCount} jugadores renderizados en el DOM del campo`);
        
        if (finalCount !== starters.length) {
            console.error(`INCONSISTENCIA: Se esperaban ${starters.length} jugadores pero solo se renderizaron ${finalCount}`);
        }
    }

    createPlayerElement(player) {
        const div = document.createElement('div');
        div.className = `player ${player.position}`;
        div.dataset.playerId = player.id;
        div.style.left = `${player.x}%`;
        div.style.top = `${player.y}%`;
        
        div.innerHTML = `
            <div class="number">${player.number}</div>
            <div class="name">${player.alias}</div>
            <div class="minutes">${player.minutesPlayed || 0}'</div>
        `;

        this.makeDraggable(div, player);
        
        // NO agregar event listener de click aquí - ya se maneja en makeDraggable
        
        return div;
    }

    makeDraggable(element, player) {
        let isDragging = false;
        let dragStartTime = 0;
        let startX, startY;
        let initialPosition = { x: 0, y: 0 };
        let mouseMoveHandler = null;
        let mouseUpHandler = null;
        let touchMoveHandler = null;
        let touchEndHandler = null;

        const handleStart = (e) => {
            dragStartTime = Date.now();
            isDragging = false;
            
            const event = e.type.includes('touch') ? e.touches[0] : e;
            initialPosition.x = event.clientX;
            initialPosition.y = event.clientY;
            
            console.log(`Iniciando interacción con ${player.alias}`);
            
            // Crear handlers únicos para este elemento
            mouseMoveHandler = (moveEvent) => handleMove(moveEvent);
            mouseUpHandler = (endEvent) => handleEnd(endEvent);
            touchMoveHandler = (moveEvent) => handleMove(moveEvent);
            touchEndHandler = (endEvent) => handleEnd(endEvent);
            
            // Agregar listeners temporales
            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            } else if (e.type === 'touchstart') {
                document.addEventListener('touchmove', touchMoveHandler, { passive: false });
                document.addEventListener('touchend', touchEndHandler);
                document.addEventListener('touchcancel', touchEndHandler);
            }
            
            e.preventDefault();
            e.stopPropagation();
        };

        const handleMove = (e) => {
            const event = e.type.includes('touch') ? e.touches[0] : e;
            
            if (!isDragging) {
                const moveThreshold = 10;
                const deltaX = Math.abs(event.clientX - initialPosition.x);
                const deltaY = Math.abs(event.clientY - initialPosition.y);
                
                if (deltaX > moveThreshold || deltaY > moveThreshold) {
                    isDragging = true;
                    element.classList.add('dragging');
                    console.log(`Drag iniciado para ${player.alias}`);
                } else {
                    return;
                }
            }
            
            e.preventDefault();
            
            const fieldRect = document.getElementById('footballField').getBoundingClientRect();
            const newX = ((event.clientX - fieldRect.left - element.offsetWidth/2) / fieldRect.width) * 100;
            const newY = ((event.clientY - fieldRect.top - element.offsetHeight/2) / fieldRect.height) * 100;
            
            const limitedX = Math.max(2, Math.min(98, newX));
            const limitedY = Math.max(2, Math.min(98, newY));
            
            element.style.left = `${limitedX}%`;
            element.style.top = `${limitedY}%`;
            element.style.zIndex = '1000';
        };

        const handleEnd = (e) => {
            const dragDuration = Date.now() - dragStartTime;
            
            // Remover listeners temporales
            if (mouseMoveHandler) {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            }
            if (touchMoveHandler) {
                document.removeEventListener('touchmove', touchMoveHandler);
                document.removeEventListener('touchend', touchEndHandler);
                document.removeEventListener('touchcancel', touchEndHandler);
            }
            
            // Reset estilos
            element.style.zIndex = '';
            element.classList.remove('dragging');

            if (isDragging) {
                const fieldRect = document.getElementById('footballField').getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                
                player.x = Math.max(2, Math.min(98, ((elementRect.left + elementRect.width/2 - fieldRect.left) / fieldRect.width) * 100));
                player.y = Math.max(2, Math.min(98, ((elementRect.top + elementRect.height/2 - fieldRect.top) / fieldRect.height) * 100));
                
                console.log(`${player.alias} movido a (${player.x.toFixed(1)}%, ${player.y.toFixed(1)}%)`);
                this.savePlayersToStorage();
            } else if (dragDuration < 250) {
                console.log(`Click en ${player.alias}, mostrando acciones`);
                setTimeout(() => this.showPlayerActions(player), 50);
            }
            
            isDragging = false;
        };

        // Solo eventos de inicio en el elemento
        element.addEventListener('mousedown', handleStart);
        element.addEventListener('touchstart', handleStart, { passive: false });
    }

    renderSubstitutes() {
        const container = document.getElementById('substitutesList');
        if (!container) {
            console.error('Container substitutesList no encontrado');
            return;
        }
        
        container.innerHTML = '';

        const substitutes = this.players.filter(p => !p.isStarter && !p.isUncalled);
        
        console.log(`Renderizando ${substitutes.length} suplentes:`);
        substitutes.forEach(p => console.log(`- ${p.number}: ${p.alias} (Starter: ${p.isStarter}, Uncalled: ${p.isUncalled})`));

        if (substitutes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay suplentes disponibles</p>';
            return;
        }

        // Ordenar suplentes por dorsal
        substitutes.sort((a, b) => a.number - b.number);

        substitutes.forEach(player => {
            const substituteElement = this.createSubstituteElement(player);
            container.appendChild(substituteElement);
        });
        
        console.log(`Suplentes renderizados: ${container.children.length}`);
    }

    createSubstituteElement(player) {
        const div = document.createElement('div');
        div.className = 'substitute';
        div.dataset.playerId = player.id;
        
        div.innerHTML = `
            <div class="player-icon ${player.position}">${player.number}</div>
            <div class="player-info">
                <div class="name">${player.alias}</div>
                <div class="position">${this.getPositionName(player.position)}</div>
            </div>
        `;
        
        div.addEventListener('click', () => this.selectSubstitute(player));
        return div;
    }

    getPositionName(position) {
        const positions = {
            'GK': 'Portero',
            'DEF': 'Defensa',
            'MID': 'Centrocampista',
            'FWD': 'Delantero'
        };
        return positions[position] || position;
    }

    // Acciones del jugador - SISTEMA CON LOGGING EXHAUSTIVO
    showPlayerActions(player) {
        console.log('=== INICIANDO SHOWPLAYERACTIONS ===');
        console.log('Jugador recibido:', player);
        console.log('Alias del jugador:', player?.alias);
        console.log('ID del jugador:', player?.id);
        console.log('Posición del jugador:', player?.position);
        
        // Validación detallada del jugador
        if (!player) {
            console.error('ERROR: Parámetro player es null o undefined');
            alert('Error: No se recibió información del jugador');
            return;
        }
        
        if (!player.id) {
            console.error('ERROR: Jugador no tiene ID válido');
            console.log('Jugador problemático:', player);
            alert('Error: Jugador sin identificador válido');
            return;
        }
        
        if (!player.alias) {
            console.error('ERROR: Jugador no tiene alias válido');
            console.log('Jugador problemático:', player);
            alert('Error: Jugador sin nombre válido');
            return;
        }
        
        console.log('✓ Validaciones de jugador pasadas');
        
        // Asignar jugador seleccionado
        this.selectedPlayer = player;
        console.log('✓ Jugador asignado a this.selectedPlayer:', this.selectedPlayer.alias);
        
        // Verificar elementos del DOM
        const modal = document.getElementById('playerActionsModal');
        const modalTitle = document.getElementById('playerActionTitle');
        
        if (!modal) {
            console.error('ERROR CRÍTICO: No se encontró playerActionsModal en el DOM');
            alert('Error crítico: Modal de acciones no encontrado. Recarga la página.');
            return;
        }
        
        if (!modalTitle) {
            console.error('ERROR: No se encontró playerActionTitle');
            alert('Error: Título del modal no encontrado');
            return;
        }
        
        console.log('✓ Elementos del DOM verificados');
        
        // Actualizar título del modal
        modalTitle.textContent = `Acciones - ${player.alias} (#${player.number})`;
        console.log('✓ Título del modal actualizado');
        
        // Verificar botones de acción
        const actionButtons = document.querySelectorAll('.action-option');
        console.log('Botones de acción en DOM:', actionButtons.length);
        
        if (actionButtons.length === 0) {
            console.error('ERROR CRÍTICO: No se encontraron botones de acción');
            alert('Error crítico: No se encontraron botones de acción. Recarga la página.');
            return;
        }
        
        let validButtons = 0;
        actionButtons.forEach((btn, index) => {
            const action = btn.dataset.action;
            console.log(`  Botón ${index + 1}: action="${action}", visible=${btn.offsetParent !== null}`);
            if (action) validButtons++;
        });
        
        if (validButtons === 0) {
            console.error('ERROR CRÍTICO: Ningún botón tiene data-action válido');
            alert('Error crítico: Botones de acción defectuosos. Recarga la página.');
            return;
        }
        
        console.log(`✓ ${validButtons} botones válidos encontrados`);
        
        // Mostrar el modal
        modal.style.display = 'block';
        console.log('✓ Modal mostrado');
        
        // Verificación final
        const isModalVisible = modal.style.display === 'block';
        const selectedPlayerSet = this.selectedPlayer && this.selectedPlayer.id === player.id;
        
        console.log('=== ESTADO FINAL ===');
        console.log('Modal visible:', isModalVisible);
        console.log('Jugador seleccionado correcto:', selectedPlayerSet);
        console.log('Jugador actual en this.selectedPlayer:', this.selectedPlayer?.alias);
        
        if (isModalVisible && selectedPlayerSet) {
            console.log('✅ MODAL DE ACCIONES ABIERTO EXITOSAMENTE');
        } else {
            console.error('❌ ERROR: Modal no se abrió correctamente');
        }
        
        console.log('=== FIN SHOWPLAYERACTIONS ===');
    }

    handlePlayerAction(action) {
        console.log('=== PROCESANDO ACCION DE JUGADOR - DETALLADO ===');
        console.log('Acción solicitada:', action);
        console.log('Jugador seleccionado:', this.selectedPlayer ? `${this.selectedPlayer.alias} (#${this.selectedPlayer.number})` : 'NINGUNO');
        
        // Validaciones básicas con logs específicos
        if (!this.selectedPlayer) {
            console.error('ERROR: No hay jugador seleccionado');
            alert('Error: No hay jugador seleccionado. Selecciona un jugador e inténtalo de nuevo.');
            return;
        }
        
        if (!action) {
            console.error('ERROR: No se recibió acción válida');
            alert('Error: Acción no válida. Inténtalo de nuevo.');
            return;
        }

        console.log('✓ Validaciones básicas pasadas');
        console.log('✓ Cerrando modal principal...');
        
        // Cerrar modal principal
        this.closeModal('playerActionsModal');
        
        console.log('✓ Modal cerrado, procesando acción:', action);

        // PROCESAMIENTO DIRECTO SIN TRY-CATCH PARA DEBUGGING
        switch (action) {
            case 'goal-scored':
                console.log('>>> Iniciando procesamiento: Gol marcado');
                try {
                    this.openGoalModal(true);
                    console.log('✓ Modal de gol abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openGoalModal(true):', error);
                    alert('Error específico en gol marcado: ' + error.message);
                }
                break;
                
            case 'goal-conceded':
                console.log('>>> Iniciando procesamiento: Gol recibido');
                try {
                    this.openGoalModal(false);
                    console.log('✓ Modal de gol recibido abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openGoalModal(false):', error);
                    alert('Error específico en gol recibido: ' + error.message);
                }
                break;
                
            case 'yellow-card':
                console.log('>>> Iniciando procesamiento: Tarjeta amarilla');
                try {
                    this.openCardModal('yellow');
                    console.log('✓ Modal de tarjeta amarilla abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openCardModal(yellow):', error);
                    alert('Error específico en tarjeta amarilla: ' + error.message);
                }
                break;
                
            case 'red-card':
                console.log('>>> Iniciando procesamiento: Tarjeta roja');
                try {
                    this.openCardModal('red');
                    console.log('✓ Modal de tarjeta roja abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openCardModal(red):', error);
                    alert('Error específico en tarjeta roja: ' + error.message);
                }
                break;
                
            case 'rival-yellow-card':
                console.log('>>> Iniciando procesamiento: Tarjeta amarilla rival');
                try {
                    this.openRivalCardModal();
                    console.log('✓ Modal de tarjeta amarilla rival abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openRivalCardModal():', error);
                    alert('Error específico en tarjeta amarilla rival: ' + error.message);
                }
                break;
                
            case 'substitution':
                console.log('>>> Iniciando procesamiento: Cambio de jugador');
                try {
                    this.openSubstitutionModal();
                    console.log('✓ Modal de cambio abierto exitosamente');
                } catch (error) {
                    console.error('ERROR en openSubstitutionModal():', error);
                    alert('Error específico en cambio: ' + error.message);
                }
                break;
                
            case 'injury':
                console.log('>>> Iniciando procesamiento: Lesión');
                try {
                    this.registerInjury();
                    console.log('✓ Lesión registrada exitosamente');
                } catch (error) {
                    console.error('ERROR en registerInjury():', error);
                    alert('Error específico en lesión: ' + error.message);
                }
                break;
                
            case 'cancel':
                console.log('>>> Procesando: Cancelar acción');
                this.selectedPlayer = null;
                console.log('✓ Acción cancelada');
                break;
                
            default:
                console.error('ERROR: Acción no reconocida:', action);
                alert(`Acción "${action}" no es válida. Acciones válidas: goal-scored, goal-conceded, yellow-card, red-card, rival-yellow-card, substitution, injury, cancel`);
                this.selectedPlayer = null;
                break;
        }
        
        console.log('=== FIN PROCESAMIENTO ACCIÓN ===');
    }

    // Sistema de goles - VERSIÓN CON LOGGING DETALLADO
    openGoalModal(isScored = true) {
        console.log('=== ABRIENDO MODAL DE GOL ===');
        console.log('Tipo de gol:', isScored ? 'Marcado' : 'Recibido');
        console.log('Jugador seleccionado:', this.selectedPlayer?.alias || 'NINGUNO');
        
        // VALIDACIÓN CRÍTICA: Verificar selectedPlayer antes de continuar
        if (!this.selectedPlayer) {
            console.error('ERROR CRÍTICO: this.selectedPlayer es null en openGoalModal');
            throw new Error('No hay jugador seleccionado válido');
        }
        
        if (!this.selectedPlayer.id) {
            console.error('ERROR CRÍTICO: this.selectedPlayer.id es inválido');
            throw new Error('Jugador seleccionado sin ID válido');
        }
        
        console.log('✓ Validación de selectedPlayer exitosa');
        
        // Validar elementos del DOM
        const modal = document.getElementById('goalModal');
        const title = document.getElementById('goalModalTitle');
        const goalScorer = document.getElementById('goalScorer');
        const goalAssist = document.getElementById('goalAssist');

        if (!modal) {
            console.error('ERROR: No se encontró goalModal');
            throw new Error('Modal de gol no encontrado en el DOM');
        }

        if (!title) {
            console.error('ERROR: No se encontró goalModalTitle');
            throw new Error('Título del modal de gol no encontrado');
        }

        if (!goalScorer) {
            console.error('ERROR: No se encontró goalScorer select');
            throw new Error('Campo goleador no encontrado');
        }

        if (!goalAssist) {
            console.error('ERROR: No se encontró goalAssist select');
            throw new Error('Campo asistencia no encontrado');
        }

        console.log('✓ Todos los elementos del DOM encontrados');

        // Configurar modal
        title.textContent = isScored ? 'Registrar Gol Marcado' : 'Registrar Gol Recibido';
        
        goalScorer.innerHTML = '';
        goalAssist.innerHTML = '<option value="">Sin asistencia</option>';

        if (isScored) {
            console.log('Configurando modal para gol marcado...');
            
            const playersOnField = this.players.filter(p => p.isStarter);
            console.log('Jugadores en campo disponibles:', playersOnField.length);
            
            if (playersOnField.length === 0) {
                console.error('ERROR: No hay jugadores en campo');
                throw new Error('No hay jugadores titulares en el campo para marcar gol');
            }
            
            playersOnField.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = `${player.number} - ${player.alias}`;
                // ARREGLO: Acceso seguro a this.selectedPlayer.id
                option.selected = this.selectedPlayer && player.id === this.selectedPlayer.id;
                goalScorer.appendChild(option);

                // ARREGLO: Acceso seguro a this.selectedPlayer.id para asistencia
                if (this.selectedPlayer && player.id !== this.selectedPlayer.id) {
                    const assistOption = document.createElement('option');
                    assistOption.value = player.id;
                    assistOption.textContent = `${player.number} - ${player.alias}`;
                    goalAssist.appendChild(assistOption);
                }
            });
            
            console.log('✓ Opciones de goleadores agregadas:', goalScorer.options.length);
            console.log('✓ Opciones de asistencia agregadas:', goalAssist.options.length);
            
        } else {
            console.log('Configurando modal para gol recibido...');
            
            const option = document.createElement('option');
            option.value = 'rival';
            option.textContent = 'Jugador rival';
            goalScorer.appendChild(option);
            
            console.log('✓ Opción de jugador rival agregada');
        }

        modal.dataset.goalType = isScored ? 'scored' : 'conceded';
        modal.style.display = 'block';
        
        console.log('✓ Modal de gol mostrado exitosamente');
        console.log('=== MODAL DE GOL ABIERTO ===');
    }

    confirmGoal() {
        console.log('=== CONFIRMANDO GOL ===');
        
        const modal = document.getElementById('goalModal');
        const isScored = modal.dataset.goalType === 'scored';
        const scorerId = document.getElementById('goalScorer').value;
        const goalType = document.getElementById('goalType').value;
        const assistId = document.getElementById('goalAssist').value;

        console.log('Tipo de gol:', isScored ? 'Marcado' : 'Recibido');
        console.log('Goleador ID:', scorerId);
        console.log('Tipo de gol:', goalType);
        console.log('Asistencia ID:', assistId);

        if (!scorerId) {
            alert('Selecciona el goleador');
            return;
        }

        let scorer = null;
        if (scorerId !== 'rival') {
            scorer = this.players.find(p => p.id == scorerId);
            if (!scorer) {
                console.error('ERROR: No se encontró el jugador goleador');
                alert('Error: Jugador goleador no encontrado');
                return;
            }
        }

        const assist = assistId ? this.players.find(p => p.id == assistId) : null;
        const currentMinute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;

        // Actualizar marcador
        if (isScored) {
            this.matchData.homeScore++;
            document.getElementById('homeScore').textContent = this.matchData.homeScore;
            document.getElementById('homeGoalDisplay').textContent = this.matchData.homeScore;
            console.log('✓ Marcador local actualizado:', this.matchData.homeScore);
        } else {
            this.matchData.awayScore++;
            document.getElementById('awayScore').textContent = this.matchData.awayScore;
            document.getElementById('awayGoalDisplay').textContent = this.matchData.awayScore;
            console.log('✓ Marcador visitante actualizado:', this.matchData.awayScore);
        }

        // Registrar evento en cronología con formato consistente
        const rivalName = document.getElementById('rivalName').value || 'RIVAL';
        let description;
        
        if (isScored) {
            description = `${currentMinute.toString().padStart(2, '0')}' - GOL DE ${scorer ? scorer.alias : 'JUGADOR'}`;
            if (assist) {
                description += ` (Asistencia: ${assist.alias})`;
            }
            description += ` - ${this.getGoalTypeName(goalType)}`;
        } else {
            description = `${currentMinute.toString().padStart(2, '0')}' - GOL DE ${rivalName.toUpperCase()}`;
        }

        // Agregar a cronología (addTimelineEvent ya maneja el registro completo)
        this.addTimelineEvent(isScored ? 'goal_home' : 'goal_away', description, '');
        
        console.log('✓ Gol registrado en cronología:', description);
        console.log('✓ Marcador actual:', this.matchData.homeScore, '-', this.matchData.awayScore);

        // Actualizar displays y cerrar modal
        this.updateGoalDisplays();
        this.closeModal('goalModal');
        
        // Limpiar jugador seleccionado
        this.selectedPlayer = null;
        
        console.log('=== GOL CONFIRMADO EXITOSAMENTE ===');
    }

    getGoalTypeName(type) {
        const types = {
            'pie-derecho': 'Pie derecho',
            'pie-izquierdo': 'Pie izquierdo',
            'cabeza': 'De cabeza',
            'frontal': 'Desde el frontal',
            'corner': 'De corner',
            'abp': 'A balón parado',
            'penalty': 'Penalti',
            'volea': 'De volea',
            'chilena': 'Chilena',
            'taconazo': 'Taconazo',
            'rebote': 'De rebote',
            'contragolpe': 'Contragolpe',
            'jugada-personal': 'Jugada personal',
            'own-goal': 'Gol en propia'
        };
        return types[type] || type;
    }

    // Sistema de cambios - VERSIÓN CON LOGGING DETALLADO
    openSubstitutionModal() {
        console.log('=== ABRIENDO MODAL DE CAMBIO ===');
        console.log('Jugador seleccionado para cambio:', this.selectedPlayer?.alias || 'NINGUNO');
        console.log('Cambios realizados:', this.matchData.substitutions, '(ilimitados)');
        
        // VALIDACIÓN CRÍTICA: Verificar selectedPlayer antes de continuar
        if (!this.selectedPlayer) {
            console.error('ERROR CRÍTICO: this.selectedPlayer es null en openSubstitutionModal');
            throw new Error('No hay jugador seleccionado válido');
        }
        
        if (!this.selectedPlayer.id) {
            console.error('ERROR CRÍTICO: this.selectedPlayer.id es inválido');
            throw new Error('Jugador seleccionado sin ID válido');
        }
        
        console.log('✓ Validación de selectedPlayer exitosa');
        
        // Cambios ilimitados habilitados

        // Validar elementos del DOM
        const modal = document.getElementById('substitutionModal');
        const playerOut = document.getElementById('playerOut');
        const playerIn = document.getElementById('playerIn');

        if (!modal) {
            console.error('ERROR: No se encontró substitutionModal');
            throw new Error('Modal de cambio no encontrado en el DOM');
        }

        if (!playerOut) {
            console.error('ERROR: No se encontró playerOut select');
            throw new Error('Campo jugador que sale no encontrado');
        }

        if (!playerIn) {
            console.error('ERROR: No se encontró playerIn select');
            throw new Error('Campo jugador que entra no encontrado');
        }

        console.log('✓ Todos los elementos del DOM encontrados');

        playerOut.innerHTML = '';
        playerIn.innerHTML = '';

        // Jugadores en campo (que pueden salir)
        const playersOnField = this.players.filter(p => p.isStarter);
        console.log('Jugadores en campo (pueden salir):', playersOnField.length);
        
        if (playersOnField.length === 0) {
            console.error('ERROR: No hay jugadores en campo');
            throw new Error('No hay jugadores titulares en el campo para realizar cambio');
        }
        
        playersOnField.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.number} - ${player.alias}`;
            // ARREGLO: Acceso seguro a this.selectedPlayer.id
            option.selected = this.selectedPlayer && player.id === this.selectedPlayer.id;
            playerOut.appendChild(option);
        });

        console.log('✓ Jugadores que pueden salir agregados:', playerOut.options.length);

        // Suplentes (no titulares, no desconvocados)
        const substitutes = this.players.filter(p => !p.isStarter && !p.isUncalled);
        console.log('Suplentes disponibles (pueden entrar):', substitutes.length);
        
        if (substitutes.length === 0) {
            console.error('ERROR: No hay suplentes disponibles');
            throw new Error('No hay suplentes disponibles para realizar el cambio');
        }
        
        substitutes.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.number} - ${player.alias}`;
            playerIn.appendChild(option);
        });

        console.log('✓ Suplentes que pueden entrar agregados:', playerIn.options.length);

        modal.style.display = 'block';
        
        console.log('✓ Modal de cambio mostrado exitosamente');
        console.log('=== MODAL DE CAMBIO ABIERTO ===');
    }

    confirmSubstitution() {
        console.log('=== CONFIRMANDO CAMBIO ===');
        
        const modal = document.getElementById('substitutionModal');
        const isInjury = modal.dataset.isInjury === 'true'; // Detectar si es por lesión
        
        console.log('¿Es cambio por lesión?:', isInjury);
        
        const outId = document.getElementById('playerOut').value;
        const inId = document.getElementById('playerIn').value;

        console.log('Jugador que sale ID:', outId);
        console.log('Jugador que entra ID:', inId);

        if (!outId || !inId) {
            alert('Selecciona ambos jugadores para el cambio');
            return;
        }

        const playerOut = this.players.find(p => p.id == outId);
        const playerIn = this.players.find(p => p.id == inId);
        
        if (!playerOut || !playerIn) {
            console.error('ERROR: No se encontraron los jugadores');
            alert('Error: Jugadores no encontrados');
            return;
        }
        
        // CORRECCIÓN: Durante el descanso, usar la duración del primer tiempo como referencia
        let currentMinute;
        if (this.matchData.isRunning) {
            currentMinute = Math.floor(this.matchData.currentTime / 60);
        } else if (this.matchData.period === 'halftime') {
            currentMinute = Math.floor(this.matchData.firstHalfDuration / 60);
        } else {
            currentMinute = 0;
        }

        // Para fútbol base, calcular y guardar minutos acumulados del jugador que sale
        if (playerOut.isStarter) {
            let minutesInThisPeriod = 0;
            
            if (playerOut.entryMinute === null || playerOut.entryMinute === 0 || playerOut.entryMinute === undefined) {
                // Jugador titular desde el inicio
                minutesInThisPeriod = currentMinute;
            } else {
                // Jugador que había entrado antes en este período
                minutesInThisPeriod = currentMinute - playerOut.entryMinute;
            }
            
            // Sumar a los minutos previos si los tenía
            if (!playerOut.previousMinutes) playerOut.previousMinutes = 0;
            playerOut.previousMinutes += minutesInThisPeriod;
            playerOut.minutesPlayed = playerOut.previousMinutes;
        }

        // Realizar cambio
        playerOut.isStarter = false;
        playerOut.exitMinute = currentMinute;
        
        // Para el jugador que entra
        playerIn.isStarter = true;
        playerIn.entryMinute = currentMinute;
        playerIn.exitMinute = null; // Asegurar que está en null
        
        // CORRECCIÓN: Marcar específicamente si entra durante el descanso
        if (this.matchData.period === 'halftime') {
            playerIn.enteredDuringHalftime = true;
        } else {
            playerIn.enteredDuringHalftime = false;
        }
        
        // CRÍTICO: Inicializar correctamente para jugadores que entran por primera vez
        if (!playerIn.previousMinutes) {
            playerIn.previousMinutes = 0;
        }
        
        // CORRECCIÓN CRÍTICA: Si es un jugador que entra por primera vez, sus minutesPlayed deben ser 0
        // IMPORTANTE: Solo si NO ha jugado antes (previousMinutes = 0)
        if (!playerIn.hasOwnProperty('minutesPlayed') || (playerIn.previousMinutes === 0)) {
            playerIn.minutesPlayed = 0;
        }
        
        console.log(`Jugador ${playerIn.alias} entra en minuto ${currentMinute} con previousMinutes: ${playerIn.previousMinutes}`);
        
        // Posicionar el jugador que entra en la misma posición del que sale
        playerIn.x = playerOut.x;
        playerIn.y = playerOut.y;

        this.matchData.substitutions++;

        // MEJORA: Descripción diferente si es por lesión
        let description;
        if (isInjury) {
            description = `${currentMinute.toString().padStart(2, '0')}' - LESIÓN Y CAMBIO - Sale ${playerOut.alias} (lesionado, ${playerOut.minutesPlayed}'), entra ${playerIn.alias}`;
            
            // Registrar también el evento de lesión en la cronología
            const injuryDescription = `${currentMinute.toString().padStart(2, '0')}' - LESIÓN - ${playerOut.alias}`;
            this.addTimelineEvent('injury', injuryDescription, '');
            
            console.log('✓ Lesión registrada:', injuryDescription);
        } else {
            description = `${currentMinute.toString().padStart(2, '0')}' - CAMBIO - Sale ${playerOut.alias} (${playerOut.minutesPlayed}'), entra ${playerIn.alias}`;
        }
        
        this.addTimelineEvent('substitution', description, '');

        console.log('✓ Cambio registrado:', description);
        console.log('✓ Total cambios realizados:', this.matchData.substitutions);

        this.renderPlayers();
        this.savePlayersToStorage();
        this.closeModal('substitutionModal');
        
        // IMPORTANTE: Limpiar dataset para futuros cambios normales
        modal.dataset.isInjury = 'false';
        
        this.selectedPlayer = null;
        
        console.log('=== CAMBIO CONFIRMADO EXITOSAMENTE ===');
    }

    // Sistema de tarjetas - VERSIÓN CON LOGGING DETALLADO
    openCardModal(cardType) {
        console.log('=== ABRIENDO MODAL DE TARJETA ===');
        console.log('Tipo de tarjeta:', cardType);
        console.log('Jugador seleccionado:', this.selectedPlayer?.alias || 'NINGUNO');
        
        // VALIDACIÓN CRÍTICA: Verificar selectedPlayer antes de continuar
        if (!this.selectedPlayer) {
            console.error('ERROR CRÍTICO: this.selectedPlayer es null en openCardModal');
            throw new Error('No hay jugador seleccionado válido');
        }
        
        if (!this.selectedPlayer.id) {
            console.error('ERROR CRÍTICO: this.selectedPlayer.id es inválido');
            throw new Error('Jugador seleccionado sin ID válido');
        }
        
        console.log('✓ Validación de selectedPlayer exitosa');
        
        // Validar elementos del DOM
        const modal = document.getElementById('cardModal');
        const title = document.getElementById('cardModalTitle');
        const cardPlayer = document.getElementById('cardPlayer');

        if (!modal) {
            console.error('ERROR: No se encontró cardModal');
            throw new Error('Modal de tarjeta no encontrado en el DOM');
        }

        if (!title) {
            console.error('ERROR: No se encontró cardModalTitle');
            throw new Error('Título del modal de tarjeta no encontrado');
        }

        if (!cardPlayer) {
            console.error('ERROR: No se encontró cardPlayer select');
            throw new Error('Campo jugador para tarjeta no encontrado');
        }

        console.log('✓ Todos los elementos del DOM encontrados');

        // Configurar modal
        title.textContent = cardType === 'yellow' ? 'Tarjeta Amarilla' : 'Tarjeta Roja';
        
        cardPlayer.innerHTML = '';
        const playersOnField = this.players.filter(p => p.isStarter);
        
        console.log('Jugadores en campo disponibles:', playersOnField.length);
        
        if (playersOnField.length === 0) {
            console.error('ERROR: No hay jugadores en campo para tarjeta');
            throw new Error('No hay jugadores titulares en el campo para recibir tarjeta');
        }
        
        playersOnField.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.number} - ${player.alias}`;
            // ARREGLO: Acceso seguro a this.selectedPlayer.id
            option.selected = this.selectedPlayer && player.id === this.selectedPlayer.id;
            cardPlayer.appendChild(option);
        });

        console.log('✓ Opciones de jugadores agregadas:', cardPlayer.options.length);

        modal.dataset.cardType = cardType;
        modal.style.display = 'block';
        
        console.log('✓ Modal de tarjeta mostrado exitosamente');
        console.log('=== MODAL DE TARJETA ABIERTO ===');
    }

    confirmCard() {
        console.log('=== CONFIRMANDO TARJETA ===');
        
        const modal = document.getElementById('cardModal');
        const cardType = modal.dataset.cardType;
        const playerId = document.getElementById('cardPlayer').value;
        const reason = document.getElementById('cardReason').value;

        console.log('Tipo de tarjeta:', cardType);
        console.log('Jugador ID:', playerId);
        console.log('Motivo:', reason);

        if (!playerId) {
            alert('Selecciona el jugador');
            return;
        }

        const player = this.players.find(p => p.id == playerId);
        if (!player) {
            console.error('ERROR: No se encontró el jugador');
            alert('Error: Jugador no encontrado');
            return;
        }

        const currentMinute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
        const description = `${currentMinute.toString().padStart(2, '0')}' - TARJETA ${cardType === 'yellow' ? 'AMARILLA' : 'ROJA'} - ${player.alias}${reason ? ` - ${reason}` : ''}`;

        // Agregar a cronología
        this.addTimelineEvent(cardType === 'yellow' ? 'card_yellow' : 'card_red', description, '');

        // Si es roja, sacar al jugador
        if (cardType === 'red') {
            player.isStarter = false;
            player.exitMinute = currentMinute;
            
            // Calcular minutos jugados
            if (player.entryMinute !== null && player.entryMinute !== undefined) {
                const playedInThisPeriod = currentMinute - player.entryMinute;
                player.previousMinutes = (player.previousMinutes || 0) + playedInThisPeriod;
                player.minutesPlayed = player.previousMinutes;
            }
            
            this.renderPlayers();
            console.log('✓ Jugador expulsado y removido del campo');
        }

        console.log('✓ Tarjeta registrada en cronología:', description);
        
        this.closeModal('cardModal');
        this.selectedPlayer = null;
        
        console.log('=== TARJETA CONFIRMADA EXITOSAMENTE ===');
    }

    // Tarjeta amarilla rival
    openRivalCardModal() {
        console.log('=== ABRIENDO MODAL DE TARJETA AMARILLA RIVAL ===');
        
        const modal = document.getElementById('rivalCardModal');
        const numberInput = document.getElementById('rivalPlayerNumber');
        const reasonSelect = document.getElementById('rivalCardReason');

        if (!modal) {
            console.error('ERROR: No se encontró rivalCardModal');
            alert('Error: Modal de tarjeta rival no encontrado. Recarga la página.');
            return;
        }

        // Limpiar campos
        if (numberInput) numberInput.value = '';
        if (reasonSelect) reasonSelect.selectedIndex = 0;

        modal.style.display = 'flex';
        
        // Enfocar el campo de número
        if (numberInput) {
            setTimeout(() => numberInput.focus(), 100);
        }
        
        console.log('✓ Modal de tarjeta amarilla rival mostrado exitosamente');
    }

    confirmRivalCard() {
        console.log('=== CONFIRMANDO TARJETA AMARILLA RIVAL ===');
        
        const numberInput = document.getElementById('rivalPlayerNumber');
        const reasonSelect = document.getElementById('rivalCardReason');
        
        if (!numberInput || !reasonSelect) {
            console.error('ERROR: No se encontraron los campos del modal rival');
            alert('Error: Campos del modal no encontrados');
            return;
        }
        
        const playerNumber = numberInput.value.trim();
        const reason = reasonSelect.value;
        
        if (!playerNumber || playerNumber < 1 || playerNumber > 99) {
            alert('Ingresa un número de dorsal válido (1-99)');
            return;
        }

        const currentMinute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
        const description = `${currentMinute.toString().padStart(2, '0')}' - TARJETA AMARILLA RIVAL (#${playerNumber})${reason ? ` - ${reason}` : ''}`;

        // Agregar a cronología
        this.addTimelineEvent('rival_card_yellow', description, '');

        console.log('✓ Tarjeta amarilla rival registrada:', description);
        
        this.closeModal('rivalCardModal');
        this.selectedPlayer = null;
        
        console.log('=== TARJETA AMARILLA RIVAL CONFIRMADA EXITOSAMENTE ===');
    }

    // Lesión
    registerInjury() {
        console.log('=== REGISTRANDO LESIÓN ===');
        
        // VALIDACIÓN CRÍTICA: Verificar selectedPlayer antes de continuar
        if (!this.selectedPlayer) {
            console.error('ERROR: No hay jugador seleccionado para lesión');
            alert('Error: No hay jugador seleccionado');
            return;
        }
        
        if (!this.selectedPlayer.alias) {
            console.error('ERROR CRÍTICO: this.selectedPlayer.alias es inválido');
            alert('Error: Jugador seleccionado sin nombre válido');
            return;
        }
        
        console.log('✓ Validación de selectedPlayer exitosa');
        console.log('Registrando lesión de:', this.selectedPlayer.alias);

        // NUEVO: Abrir modal para seleccionar sustituto por lesión
        this.openInjurySubstitutionModal();
    }

    // NUEVA FUNCIÓN: Modal para seleccionar sustituto por lesión
    openInjurySubstitutionModal() {
        console.log('=== ABRIENDO MODAL DE LESIÓN CON CAMBIO ===');
        console.log('Jugador lesionado:', this.selectedPlayer?.alias || 'NINGUNO');
        
        // Cambios ilimitados habilitados para lesiones

        // Validar elementos del DOM
        const modal = document.getElementById('substitutionModal');
        const playerOut = document.getElementById('playerOut');
        const playerIn = document.getElementById('playerIn');

        if (!modal) {
            console.error('ERROR: No se encontró substitutionModal');
            alert('Error: Modal de cambio no encontrado. Recarga la página.');
            return;
        }

        if (!playerOut || !playerIn) {
            console.error('ERROR: No se encontraron campos playerOut o playerIn');
            alert('Error: Campos del modal no encontrados. Recarga la página.');
            return;
        }

        console.log('✓ Todos los elementos del DOM encontrados');

        // Cambiar el título del modal
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = `Cambio por Lesión - ${this.selectedPlayer.alias}`;
        }

        // Limpiar opciones
        playerOut.innerHTML = '';
        playerIn.innerHTML = '';

        // El jugador lesionado debe salir (preseleccionado)
        const outOption = document.createElement('option');
        outOption.value = this.selectedPlayer.id;
        outOption.textContent = `${this.selectedPlayer.number} - ${this.selectedPlayer.alias} (LESIONADO)`;
        outOption.selected = true;
        playerOut.appendChild(outOption);

        // Suplentes disponibles para entrar
        const substitutes = this.players.filter(p => !p.isStarter && !p.isUncalled);
        console.log('Suplentes disponibles para lesión:', substitutes.length);
        
        if (substitutes.length === 0) {
            alert('No hay suplentes disponibles para el cambio por lesión.');
            return;
        }
        
        substitutes.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.number} - ${player.alias}`;
            playerIn.appendChild(option);
        });

        console.log('✓ Opciones agregadas al modal de lesión');

        // Marcar que es una lesión para el procesamiento posterior
        modal.dataset.isInjury = 'true';
        modal.style.display = 'block';
        
        console.log('✓ Modal de lesión con cambio mostrado exitosamente');
        console.log('=== MODAL DE LESIÓN ABIERTO ===');
    }

    // Cronología - SISTEMA COMPLETAMENTE REDISEÑADO
    addTimelineEvent(type, description, icon, forceMinute = null) {
        // CORRECCIÓN: Lógica mejorada para asignar el minuto correcto del evento
        let currentMinute = 0;
        
        if (forceMinute !== null) {
            // Si se especifica un minuto explícitamente, usarlo
            currentMinute = forceMinute;
        } else if (this.matchData.isRunning) {
            // Si el partido está en curso, usar el tiempo actual
            currentMinute = Math.floor(this.matchData.currentTime / 60);
        } else if (this.matchData.period === 'halftime') {
            // Si estamos en descanso, usar la duración del primer tiempo
            currentMinute = Math.floor(this.matchData.firstHalfDuration / 60);
        } else if (this.matchData.period === 'second_half') {
            // Si ya terminó el segundo tiempo, usar el tiempo total del partido
            const halfDuration = this.matchData.settings.halfDuration;
            currentMinute = Math.floor((this.matchData.firstHalfDuration + this.matchData.secondHalfDuration) / 60);
        } else {
            // Para eventos del inicio del partido o casos especiales
            currentMinute = 0;
        }
        
        const event = {
            id: Date.now() + Math.random(), // ID único para cada evento
            type: type,
            minute: currentMinute,
            description: description,
            icon: icon || '', // Evitar iconos problemáticos
            timestamp: new Date()
        };

        this.matchData.events.push(event);
        
        console.log('=== EVENTO AGREGADO A CRONOLOGIA ===');
        console.log('ID:', event.id);
        console.log('Tipo:', event.type);
        console.log('Minuto:', event.minute);
        console.log('Descripción:', event.description);
        console.log('Total eventos:', this.matchData.events.length);
        
        // Actualizar cronología inmediatamente
        this.updateTimelineDisplay();
        
        // Verificación de renderizado
        setTimeout(() => {
            const timelineContainer = document.getElementById('timelineEvents');
            const eventCount = timelineContainer ? timelineContainer.children.length : 0;
            console.log(`Verificación: ${eventCount} eventos visibles en la cronología`);
        }, 100);
    }

    updateTimelineDisplay() {
        const container = document.getElementById('timelineEvents');
        if (!container) {
            console.error('ERROR CRÍTICO: Container timelineEvents no encontrado');
            return;
        }
        
        // Limpiar completamente el contenedor
        container.innerHTML = '';

        console.log('=== ACTUALIZANDO CRONOLOGIA ===');
        console.log('Eventos disponibles:', this.matchData.events.length);

        if (this.matchData.events.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay eventos registrados</p>';
            console.log('Cronología vacía - mensaje mostrado');
            return;
        }

        // Mostrar eventos en orden cronológico inverso (más recientes primero)
        const sortedEvents = [...this.matchData.events].reverse();
        
        console.log('Eventos ordenados para mostrar:', sortedEvents.length);

        sortedEvents.forEach((event, index) => {
            try {
                const eventElement = document.createElement('div');
                eventElement.className = `timeline-event ${event.type}`;
                eventElement.dataset.eventId = event.id || index;
                
                // CRÍTICO: Estructura HTML limpia sin emojis problemáticos
                eventElement.innerHTML = `
                    <div class="event-description">
                        <span class="event-text">${event.description || 'Evento sin descripción'}</span>
                    </div>
                `;
                
                container.appendChild(eventElement);
                console.log(`✓ Evento ${index + 1} renderizado:`, event.description);
                
            } catch (error) {
                console.error(`Error al renderizar evento ${index + 1}:`, error, event);
                
                // Crear elemento de error como fallback
                const errorElement = document.createElement('div');
                errorElement.className = 'timeline-event error';
                errorElement.innerHTML = `
                    <div class="event-description">
                        <span class="event-text">Error al mostrar evento ${index + 1}</span>
                    </div>
                `;
                container.appendChild(errorElement);
            }
        });
        
        const finalCount = container.children.length;
        console.log(`✓ Cronología actualizada: ${finalCount} eventos renderizados`);
        
        if (finalCount !== sortedEvents.length) {
            console.error(`INCONSISTENCIA: Se esperaban ${sortedEvents.length} eventos pero solo se renderizaron ${finalCount}`);
        } else {
            console.log('✓ Cronología renderizada completamente');
        }
    }

    selectSubstitute(player) {
        document.querySelectorAll('.substitute.selected').forEach(el => {
            el.classList.remove('selected');
        });

        const substituteElement = document.querySelector(`[data-player-id="${player.id}"].substitute`);
        substituteElement.classList.add('selected');
        this.selectedSubstitute = player;
    }

    // Exportar PDF mejorado
    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        try {
            // Configuración y colores corporativos
            pdf.setFont('helvetica');
            let yPos = 25;
            const lineHeight = 8;
            const atleticoRed = [206, 32, 41];
            const atleticoBlue = [27, 41, 81];
            const lightGray = [240, 240, 240];
            
            // Encabezado principal con fondo rojo
            pdf.setFillColor(...atleticoRed);
            pdf.rect(0, 0, 210, 35, 'F');
            
            // Título principal en blanco
            pdf.setFontSize(20);
            pdf.setTextColor(255, 255, 255);
            pdf.text('ATLÉTICO DE MADRID', 105, 15, { align: 'center' });
            
            pdf.setFontSize(14);
            pdf.text('ANÁLISIS DEL PARTIDO - FÚTBOL BASE', 105, 25, { align: 'center' });
            
            yPos = 50;
            
            // Sección de información del partido con fondo gris
            pdf.setFillColor(...lightGray);
            pdf.rect(10, yPos - 5, 190, 40, 'F');
            
            pdf.setFontSize(16);
            pdf.setTextColor(...atleticoBlue);
            pdf.text('INFORMACIÓN DEL PARTIDO', 105, yPos + 5, { align: 'center' });
            
            yPos += 20;
            
            // Datos del partido
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            const matchDate = document.getElementById('matchDate').value;
            const rival = document.getElementById('rivalName').value || 'RIVAL';
            const venue = document.getElementById('matchVenue').value || 'Campo no especificado';
            const category = document.getElementById('category').value;
            const homeAway = document.getElementById('homeAway').value;
            const matchDayValue = document.getElementById('matchDay').value;
            const matchDay = matchDayValue ? `Jornada ${matchDayValue}` : 'Sin especificar';
            
            const matchInfo = [
                `Fecha: ${new Date(matchDate).toLocaleDateString('es-ES')}`,
                `Jornada: ${matchDay}`,
                `Rival: ${rival}`,
                `Campo: ${venue}`,
                `Categoría: ${category.toUpperCase()}`,
                `Condición: ${homeAway.toUpperCase()}`,
                `Resultado Final: ${this.matchData.homeScore} - ${this.matchData.awayScore}`
            ];
            
            matchInfo.forEach(info => {
                pdf.text(info, 20, yPos);
                yPos += lineHeight;
            });
            
            yPos += 15;
            
            // Sección de alineación titular
            if (yPos > 240) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.setFillColor(...atleticoBlue);
            pdf.rect(10, yPos - 5, 190, 12, 'F');
            
            pdf.setFontSize(14);
            pdf.setTextColor(255, 255, 255);
            pdf.text('ALINEACIÓN TITULAR (11 JUGADORES)', 20, yPos + 3);
            
            yPos += 20;
            
            // MODIFICACIÓN 2: Usar titulares originales en lugar de jugadores actuales en campo
            const starterPlayers = this.matchData.originalStarters || [];
            
            if (starterPlayers.length > 0) {
                // Ordenar por posición: GK, DEF, MID, FWD y luego por número
                const positionOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4 };
                const sortedStarters = [...starterPlayers].sort((a, b) => {
                    const posA = positionOrder[a.position] || 5;
                    const posB = positionOrder[b.position] || 5;
                    if (posA !== posB) return posA - posB;
                    return a.number - b.number;
                });
                
                // Encabezados de tabla
                pdf.setFillColor(...lightGray);
                pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text('DORSAL', 15, yPos);
                pdf.text('JUGADOR', 40, yPos);
                pdf.text('POSICIÓN', 110, yPos);
                pdf.text('NOMBRE COMPLETO', 150, yPos);
                
                yPos += lineHeight + 5;
                pdf.setFont('helvetica', 'normal');
                
                sortedStarters.forEach((player, index) => {
                    if (yPos > 275) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    
                    // Alternar colores de fila
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                        pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                    }
                    
                    pdf.setTextColor(0, 0, 0);
                    pdf.text(`#${player.number}`, 15, yPos);
                    pdf.text(player.alias, 40, yPos);
                    pdf.text(this.getPositionName(player.position), 110, yPos);
                    
                    // Nombre completo truncado si es muy largo
                    const fullName = player.fullName || player.alias;
                    const truncatedName = fullName.length > 25 ? fullName.substring(0, 22) + '...' : fullName;
                    pdf.text(truncatedName, 150, yPos);
                    
                    yPos += lineHeight;
                });
                
                // Mostrar total de titulares
                yPos += 5;
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(...atleticoRed);
                pdf.text(`TOTAL TITULARES: ${sortedStarters.length}/11`, 20, yPos);
                pdf.setFont('helvetica', 'normal');
                
            } else {
                pdf.setTextColor(128, 128, 128);
                pdf.text('No se han seleccionado jugadores titulares', 20, yPos);
            }
            
            yPos += 20;
            
            // Sección de cronología
            if (yPos > 250) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.setFillColor(...atleticoRed);
            pdf.rect(10, yPos - 5, 190, 12, 'F');
            
            pdf.setFontSize(14);
            pdf.setTextColor(255, 255, 255);
            pdf.text('CRONOLOGÍA DEL PARTIDO', 20, yPos + 3);
            
            yPos += 20;
            
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            
            if (this.matchData.events.length > 0) {
                // MODIFICACIÓN 3: Ordenar eventos cronológicamente desde minuto 0 hacia abajo
                // Sistema de ordenamiento cronológico estricto
                const firstHalfMinutes = Math.floor((this.matchData.firstHalfDuration || 1800) / 60);
                
                const sortedEvents = [...this.matchData.events].sort((a, b) => {
                    // Crear un "momento del partido" para cada evento que considere:
                    // 1. Período del partido (primer tiempo < descanso < segundo tiempo)
                    // 2. Minuto dentro del período
                    // 3. Orden lógico de eventos dentro del mismo minuto
                    
                    function getEventMoment(event) {
                        let periodMultiplier = 0;
                        let internalOrder = 0;
                        
                        // Definir período base
                        if (event.type === 'start_match') {
                            periodMultiplier = 0;
                            internalOrder = 0;
                        } else if (event.type === 'end_first_half') {
                            periodMultiplier = 1000;
                            internalOrder = 900; // Final del primer tiempo
                        } else if (event.type === 'substitution' && event.minute === firstHalfMinutes) {
                            // CORRECCIÓN: Cambios del descanso van después del final del primer tiempo
                            periodMultiplier = 1000;
                            internalOrder = 950; // Entre final primer tiempo e inicio segundo tiempo
                        } else if (event.type === 'start_second_half') {
                            periodMultiplier = 1000;
                            internalOrder = 999; // Inicio del segundo tiempo
                        } else if (event.type === 'end_match') {
                            periodMultiplier = 3000;
                            internalOrder = 999; // Final del partido
                        } else {
                            // Eventos normales del juego
                            if (event.minute <= firstHalfMinutes) {
                                periodMultiplier = 0; // Primer tiempo
                            } else {
                                periodMultiplier = 2000; // Segundo tiempo
                            }
                            
                            // Orden dentro del minuto
                            const typeOrder = {
                                'goal_home': 1, 
                                'goal_away': 1,
                                'card_yellow': 2,
                                'card_red': 2,
                                'rival_card_yellow': 2,
                                'injury': 3,
                                'substitution': 4
                            };
                            internalOrder = (typeOrder[event.type] || 5) * 10;
                        }
                        
                        return periodMultiplier + (event.minute * 10) + internalOrder;
                    }
                    
                    const momentA = getEventMoment(a);
                    const momentB = getEventMoment(b);
                    
                    if (momentA !== momentB) {
                        return momentA - momentB;
                    }
                    
                    // Si tienen el mismo momento, ordenar por timestamp de creación
                    return new Date(a.timestamp) - new Date(b.timestamp);
                });
                
                sortedEvents.forEach((event, index) => {
                    // Alternar colores de fondo para mejor legibilidad
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                        pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                    }
                    
                    // Colorear por tipo de evento
                    if (event.type === 'goal') {
                        pdf.setTextColor(...atleticoRed);
                    } else if (event.type === 'card') {
                        pdf.setTextColor(255, 140, 0);
                    } else if (event.type === 'substitution') {
                        pdf.setTextColor(...atleticoBlue);
                    } else {
                        pdf.setTextColor(0, 0, 0);
                    }
                    
                    const text = `${event.minute.toString().padStart(2, '0')}' - ${event.description}`;
                    // Limpiar caracteres especiales que pueden causar problemas en PDF
                    const cleanText = text.replace(/[^\w\s\-:()áéíóúüñÁÉÍÓÚÜÑ]/g, '');
                    const lines = pdf.splitTextToSize(cleanText, 170);
                    
                    lines.forEach(line => {
                        if (yPos > 270) {
                            pdf.addPage();
                            yPos = 20;
                        }
                        pdf.text(line, 20, yPos);
                        yPos += lineHeight;
                    });
                    yPos += 2;
                });
            } else {
                pdf.setTextColor(128, 128, 128);
                pdf.text('No se registraron eventos durante el partido', 20, yPos);
                yPos += lineHeight;
            }
            
            yPos += 15;
            
            // Sección de minutos jugados
            if (yPos > 250) {
                pdf.addPage();
                yPos = 20;
            }
            
            pdf.setFillColor(...atleticoBlue);
            pdf.rect(10, yPos - 5, 190, 12, 'F');
            
            pdf.setFontSize(14);
            pdf.setTextColor(255, 255, 255);
            pdf.text('MINUTOS JUGADOS Y ESTADÍSTICAS', 20, yPos + 3);
            
            yPos += 20;
            
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            
            const playersWithMinutes = this.players
                .filter(p => p.minutesPlayed > 0 || p.exitMinute !== null)
                .sort((a, b) => (b.minutesPlayed || 0) - (a.minutesPlayed || 0));
            
            if (playersWithMinutes.length > 0) {
                // Encabezados de tabla
                pdf.setFillColor(...lightGray);
                pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text('DORSAL', 15, yPos);
                pdf.text('JUGADOR', 35, yPos);
                pdf.text('POSICIÓN', 100, yPos);
                pdf.text('MINUTOS', 140, yPos);
                pdf.text('ESTADO', 170, yPos);
                
                yPos += lineHeight + 5;
                pdf.setFont('helvetica', 'normal');
                
                playersWithMinutes.forEach((player, index) => {
                    if (yPos > 275) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    
                    // Alternar colores de fila
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                        pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                    }
                    
                    const minutes = player.exitMinute !== null ? 
                        (player.exitMinute - (player.entryMinute || 0)) : 
                        (player.minutesPlayed || 0);
                    
                    const status = player.isStarter ? 'En campo' : 
                                 player.exitMinute !== null ? 'Sustituido' : 'Suplente';
                    
                    pdf.setTextColor(0, 0, 0);
                    pdf.text(`#${player.number}`, 15, yPos);
                    pdf.text(player.alias, 35, yPos);
                    pdf.text(this.getPositionName(player.position), 100, yPos);
                    pdf.text(`${minutes}'`, 140, yPos);
                    
                    // Color del estado
                    if (status === 'En campo') {
                        pdf.setTextColor(...atleticoRed);
                    } else if (status === 'Sustituido') {
                        pdf.setTextColor(...atleticoBlue);
                    } else {
                        pdf.setTextColor(128, 128, 128);
                    }
                    pdf.text(status, 170, yPos);
                    
                    yPos += lineHeight;
                });
            } else {
                pdf.setTextColor(128, 128, 128);
                pdf.text('No hay jugadores con minutos registrados', 20, yPos);
            }
            
            // Sección de jugadores desconvocados
            const uncalledPlayers = this.players.filter(p => p.isUncalled);
            if (uncalledPlayers.length > 0) {
                yPos += 20;
                
                if (yPos > 250) {
                    pdf.addPage();
                    yPos = 20;
                }
                
                // Encabezado de jugadores desconvocados
                pdf.setFillColor(...atleticoBlue);
                pdf.rect(10, yPos - 5, 190, 12, 'F');
                
                pdf.setFontSize(14);
                pdf.setTextColor(255, 255, 255);
                pdf.text('JUGADORES DESCONVOCADOS', 20, yPos + 3);
                
                yPos += 20;
                
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                
                // Ordenar desconvocados por dorsal
                const sortedUncalled = [...uncalledPlayers].sort((a, b) => a.number - b.number);
                
                sortedUncalled.forEach((player, index) => {
                    if (yPos > 275) {
                        pdf.addPage();
                        yPos = 20;
                    }
                    
                    // Alternar colores de fondo
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                        pdf.rect(10, yPos - 3, 190, lineHeight + 2, 'F');
                    }
                    
                    pdf.text(`#${player.number} - ${player.alias} (${this.getPositionName(player.position)})`, 20, yPos);
                    yPos += lineHeight;
                });
            }
            
            // Pie de página corporativo
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                
                // Línea decorativa
                pdf.setDrawColor(...atleticoRed);
                pdf.setLineWidth(2);
                pdf.line(10, 285, 200, 285);
                
                // Texto del pie
                pdf.setFontSize(8);
                pdf.setTextColor(...atleticoBlue);
                pdf.text('Por Atlético de Madrid - Análisis Fútbol Base', 105, 292, { align: 'center' });
                pdf.text(`Página ${i} de ${totalPages}`, 190, 292, { align: 'right' });
                
                // Fecha de generación
                pdf.setTextColor(128, 128, 128);
                pdf.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, 292);
            }
            
            // Generar nombre del archivo
            const fileName = `SEGUIMIENTO_PARTIDO_${rival.replace(/[^a-zA-Z0-9]/g, '_')}_${matchDate}.pdf`;
            pdf.save(fileName);
            
            alert('¡PDF generado exitosamente!');
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF. Inténtalo de nuevo.');
        }
    }

    // Función de debugging para troubleshooting
    debugPlayerStatus() {
        console.log('=== DEBUG: Estado de jugadores ===');
        console.log(`Total jugadores: ${this.players.length}`);
        
        const starters = this.players.filter(p => p.isStarter);
        const uncalled = this.players.filter(p => p.isUncalled);
        const available = this.players.filter(p => !p.isStarter && !p.isUncalled);
        
        console.log(`Titulares: ${starters.length}`);
        starters.forEach(p => console.log(`  - ${p.number}: ${p.alias} (${p.position}) - Pos: (${p.x}, ${p.y}) - Min: ${p.minutesPlayed || 0}`));
        
        console.log(`Desconvocados: ${uncalled.length}`);
        uncalled.forEach(p => console.log(`  - ${p.number}: ${p.alias} (${p.position})`));
        
        console.log(`Disponibles: ${available.length}`);
        available.forEach(p => console.log(`  - ${p.number}: ${p.alias} (${p.position})`));
        
        console.log('=== FIN DEBUG ===');
    }

    // Utilidades
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        
        // CRÍTICO: Solo limpiar selectedPlayer al cancelar acciones específicas
        // NO limpiar cuando se cierra el modal principal para procesar una acción
        if (modalId === 'goalModal' || modalId === 'cardModal' || modalId === 'substitutionModal') {
            this.selectedPlayer = null;
            console.log('✓ selectedPlayer limpiado al cancelar modal específico:', modalId);
        }
        
        // Restaurar título original del modal de sustitución si fue cambiado por lesión
        if (modalId === 'substitutionModal') {
            const modal = document.getElementById('substitutionModal');
            const modalTitle = modal.querySelector('h3');
            if (modalTitle && modal.dataset.isInjury === 'true') {
                modalTitle.textContent = 'Realizar Cambio';
                modal.dataset.isInjury = 'false';
                console.log('✓ Título del modal de sustitución restaurado');
            }
        }
        
        console.log('✓ Modal cerrado:', modalId);
    }

    savePlayersToStorage() {
        localStorage.setItem('atletico_base_players', JSON.stringify(this.players));
    }

    saveMatchData() {
        const matchInfo = {
            date: document.getElementById('matchDate').value,
            venue: document.getElementById('matchVenue').value,
            rival: document.getElementById('rivalName').value,
            homeAway: document.getElementById('homeAway').value,
            category: document.getElementById('category').value,
            score: `${this.matchData.homeScore}-${this.matchData.awayScore}`,
            events: this.matchData.events,
            players: this.players,
            timestamp: new Date()
        };

        const matches = JSON.parse(localStorage.getItem('atletico_base_matches')) || [];
        matches.push(matchInfo);
        localStorage.setItem('atletico_base_matches', JSON.stringify(matches));
    }
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.matchAnalyzer = new MatchAnalyzer();
});

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker registrado'))
            .catch(error => console.log('Error SW:', error));
    });
}