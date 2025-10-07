# CORRECCIÓN CRÍTICA: MINUTOS DE JUGADORES QUE ENTRAN

## ❌ Problemas Identificados

### 1. Jugadores Empezaban con 6 Minutos en Lugar de 0
**Problema:** Juanito, Fuentes y otros jugadores que entraban por cambio comenzaban con 6 minutos en lugar de 0.

**Casos:**
- Juanito entra en descanso → debería empezar con 0 minutos
- Fuentes entra en minuto 3 del segundo tiempo → debería empezar con 0 minutos

### 2. Error en Generación de PDF
**Problema:** "Error al generar el PDF. Inténtalo de nuevo."
**Causa:** Referencias a `this.matchData.firstHalfDuration` que podían ser undefined

## ✅ Soluciones Implementadas

### 1. Lógica Corregida en `updatePlayersMinutes()`

**ANTES (Problemático):**
```javascript
if (player.enteredDuringHalftime && this.matchData.period === 'second') {
    const firstHalfMinutes = Math.floor(this.matchData.firstHalfDuration / 60);
    minutesToAdd = Math.max(0, currentMinute - firstHalfMinutes);
}
```

**DESPUÉS (Correcto):**
```javascript
if (player.enteredDuringHalftime) {
    if (this.matchData.period === 'second') {
        // Solo en segundo tiempo: empezar desde inicio del segundo tiempo
        const firstHalfMinutes = Math.floor(this.matchData.firstHalfDuration / 60);
        minutesToAdd = Math.max(0, currentMinute - firstHalfMinutes);
    } else {
        // Si estamos en primer tiempo o descanso, no suma minutos
        minutesToAdd = 0;
    }
}
```

### 2. Inicialización Correcta en `confirmSubstitution()`

**Añadido:**
```javascript
// CORRECCIÓN CRÍTICA: Si es un jugador que entra por primera vez
if (playerIn.enteredDuringHalftime || !playerIn.hasOwnProperty('minutesPlayed')) {
    playerIn.minutesPlayed = 0;
}
```

### 3. Protección en PDF contra Errores

**Protección añadida:**
```javascript
// Evitar errores por valores undefined
event.minute === Math.floor((this.matchData.firstHalfDuration || 1800) / 60)
```

## ✅ Comportamiento Correcto Ahora

### **Jugador que entra en descanso:**
- ✅ Minutos iniciales: **0**
- ✅ Empieza a contar desde inicio del segundo tiempo
- ✅ No suma minutos del primer tiempo

### **Jugador que entra durante el partido:**
- ✅ Minutos iniciales: **0**
- ✅ Empieza a contar desde su minuto de entrada
- ✅ Solo suma tiempo realmente jugado

### **PDF:**
- ✅ Genera correctamente sin errores
- ✅ Orden cronológico mantenido
- ✅ Cambios del descanso en posición correcta

## Verificación

**Casos de Prueba:**
1. **Juanito entra en descanso** → Debe mostrar 0 minutos al iniciar segundo tiempo ✅
2. **Fuentes entra en minuto 35** → Debe mostrar 0 minutos al entrar ✅
3. **PDF se genera** → Sin errores ✅
4. **Orden cronológico** → Respetado ✅

**Principio:** Los jugadores solo suman minutos cuando realmente están en el campo de juego.
