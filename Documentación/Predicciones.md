# Algoritmo de Predicción de Síntomas y Bienestar

Este documento detalla el diseño, la lógica matemática y el funcionamiento del motor de predicciones de salud implementado en **MiCiclo**. El objetivo es alertar al usuario en la pantalla principal sobre la posible aparición de dolores o síntomas en base a los patrones repetitivos extraídos de sus ciclos pasados.

---

## 1. Fundamentos del Algoritmo

Para predecir un síntoma en una fecha específica (por ejemplo, hoy $D_{hoy}$), el algoritmo realiza un análisis de coincidencia de patrones en dos direcciones temporales respecto a los ciclos anteriores:

1. **Predicción Directa (Forward Offset):** Enfocada en la primera mitad del ciclo (fase menstrual y folicular). Compara el día de ciclo actual del usuario con el mismo día de ciclo en el pasado.
2. **Predicción Reversa (Backward Offset):** Enfocada en la segunda mitad del ciclo (ventana fértil y fase lútea/premenstrual). Compara los días restantes antes de la regla estimada con los mismos días previos a la regla en ciclos anteriores.

### Parámetros de Entrada
- $cycleDay$: Día de ciclo actual de la usuaria.
- $daysBeforePeriod$: Días restantes estimados para el inicio del próximo período, calculado como:
  \[daysBeforePeriod = L_{ciclo} - cycleDay + 1\]
  donde $L_{ciclo}$ es la duración promedio del ciclo.
- $S_i$: Fecha de inicio del ciclo histórico $i$.
- $S_{i+1}$: Fecha de inicio del siguiente ciclo histórico (que marca el fin del ciclo $i$).

---

## 2. Lógica de Coincidencia y Tolerancia

El algoritmo recupera los últimos $M$ ciclos históricos completados (máximo los últimos 6 ciclos). 

Para cada ciclo histórico $i \in [1, M]$:
1. Calcula la fecha objetivo directa en ese ciclo:
   \[D_{forward} = S_i + cycleDay - 1\]
2. Calcula la fecha objetivo reversa en ese ciclo:
   \[D_{backward} = S_{i+1} - daysBeforePeriod\]

### Ventana de Tolerancia Temporal
Los síntomas biológicos pueden fluctuar ligeramente de fecha debido al estrés, la alimentación o la fatiga. Por ello, el algoritmo no solo inspecciona la fecha exacta, sino que abre una **ventana de tolerancia de $\pm 1$ día** alrededor de los objetivos:
- Rango directo a evaluar: \([D_{forward} - 1, D_{forward} + 1]\)
- Rango reverso a evaluar: \([D_{backward} - 1, D_{backward} + 1]\)

Si el síntoma o dolor consultado se registró en **cualquiera** de los días dentro de estas ventanas para el ciclo $i$, se cuenta como un **acierto (match)** en ese ciclo.

---

## 3. Criterio de Umbral (Threshold)

Para evitar falsas alertas por eventos puntuales o aislados, una predicción solo se activa en la pantalla principal si el número de aciertos acumulados supera un umbral dinámico basado en la cantidad de datos históricos disponibles:

- **Si el historial cuenta con 5 o 6 ciclos:** El síntoma debe haber aparecido en al menos **3 ciclos**.
- **Si el historial cuenta con 3 o 4 ciclos:** El síntoma debe haber aparecido en al menos **2 ciclos**.
- **Si el historial cuenta con 1 o 2 ciclos:** El síntoma debe haber aparecido en al menos **2 ciclos** (o **1** en entornos de depuración/demostración inicial).

---

## 4. Síntomas y Dolor Evaluados

El motor analiza los siguientes registros del formulario diario:
- **Dolor Menstrual:** Evaluado mediante el nivel de dolor (`painLevel`). Un nivel de dolor medio o fuerte ($\ge 2$) en el historial se considera como un día con molestias activas.
- **Síntomas Específicos:**
  - Cansancio/Cabeza (`headache`)
  - Hinchazón (`bloating`)
  - Humor sensible (`mood`)
  - Pinchazos (`cramps`)
  - Pezones sensibles (`nipples`)

---

## 5. Ejemplo Práctico (Demostración de la Aplicación)

La base de datos simulada en la inicialización de la app cuenta con los siguientes datos del historial para ilustrar la funcionalidad inmediatamente el **30 de Junio** (Día 9 del Ciclo 3):

- **Ciclo 1 (Inició el 25 de Abril):** En el Día 9 (3 de Mayo), la usuaria registró `headache` (dolor de cabeza ligero).
- **Ciclo 2 (Inició el 24 de Mayo):** En el Día 9 (1 de Junio), la usuaria registró `headache` y `nipples` (pezones sensibles).
- **Ciclo 3 (Inició el 22 de Junio):** Hoy es **30 de Junio** (Día 9 del ciclo).

Al cargar la aplicación, el motor de predicciones realiza el siguiente cálculo para el síntoma `headache`:
- Ciclos históricos analizados: 2.
- Aciertos en Día 9 (ventana de tolerancia May 2 - May 4 y May 31 - Jun 2): **2 aciertos** (May 3 y Jun 1).
- Umbral para 2 ciclos históricos: **2 aciertos**.
- **Resultado:** Se cumple la condición de activación. La pantalla principal muestra:
  > *🔮 Es probable que hoy sientas Cansancio/Cabeza (Patrón detectado en 2 de tus últimos 2 ciclos)*.
