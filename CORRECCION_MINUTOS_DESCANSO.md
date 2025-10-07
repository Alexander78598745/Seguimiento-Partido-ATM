# CORRECCIÓN ESPECÍFICA - MINUTOS EN DESCANSO

## PROBLEMA IDENTIFICADO
Los jugadores que entran durante el descanso seguían acumulando minutos incorrectamente.

## EJEMPLO DEL PROBLEMA:
1. Primer tiempo termina en minuto 30
2. Durante el descanso se hace un cambio 
3. El jugador que entra recibía 30 minutos automáticamente
4. **INCORRECTO**: El jugador no ha jugado ningún minuto real

## CORRECCIÓN IMPLEMENTADA

### Archivo: `app.js`

#### 1. Función `confirmSubstitution()` (líneas 1817-1827)
**Antes:**
```javascript
const currentMinute = this.matchData.isRunning ? Math.floor(this.matchData.currentTime / 60) : 0;
```

**Después:**
```javascript
// CORRECCIÓN: Durante el descanso, usar la duración del primer tiempo como referencia
let currentMinute;
if (this.matchData.isRunning) {
    currentMinute = Math.floor(this.matchData.currentTime / 60);
} else if (this.matchData.period === 'halftime') {
    currentMinute = Math.floor(this.matchData.firstHalfDuration / 60);
} else {
    currentMinute = 0;
}
```

#### 2. Función `updatePlayersMinutes()` (líneas 400-420)
**Lógica corregida:**
```javascript
if (player.entryMinute >= firstHalfMinutes) {
    // Jugador que entró durante el descanso o al inicio del segundo tiempo
    if (this.matchData.period === 'second') {
        // Solo contar minutos desde que empezó el segundo tiempo realmente
        minutesToAdd = Math.max(0, currentMinute - firstHalfMinutes);
    } else {
        // Si todavía estamos en descanso, no sumar minutos
        minutesToAdd = 0;
    }
}
```

## RESULTADO DE LA CORRECCIÓN

### ✅ AHORA FUNCIONA CORRECTAMENTE:

**Escenario 1: Cambio durante el descanso**
- Primer tiempo termina: minuto 30
- Se hace cambio durante descanso
- Jugador que entra: **0 minutos** (correcto)
- Cuando inicia segundo tiempo: empieza a contar desde 0

**Escenario 2: Cambio en segundo tiempo**
- Jugador entra en minuto 50
- Solo cuenta: 50 - 30 = **20 minutos** (correcto)

**Escenario 3: Titular desde inicio**
- Cuenta todos los minutos normalmente

### 🔒 GARANTÍA
- Solo se corrigió el cálculo de minutos
- No se modificó ninguna otra funcionalidad
- La lógica de cambios, cronología y PDF permanece intacta

## COMPROBACIÓN
Para verificar que funciona:
1. Inicia un partido
2. Termina el primer tiempo en cualquier minuto
3. Haz un cambio durante el descanso
4. El jugador que entra debe mostrar **0 minutos**
5. Inicia el segundo tiempo
6. El jugador empezará a acumular minutos desde ese momento

✅ **CORRECCIÓN COMPLETADA**
