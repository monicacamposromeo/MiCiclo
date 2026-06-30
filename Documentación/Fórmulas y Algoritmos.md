# MiCiclo - Documentación de Fórmulas y Algoritmos

Este documento detalla las metodologías y fórmulas matemáticas utilizadas en **MiCiclo** para calcular las estadísticas y predicciones del ciclo menstrual, la regla y los periodos de fertilidad.

---

## 1. Detección del Inicio del Ciclo

El primer paso consiste en identificar los días en los que comienza un nuevo ciclo menstrual. Definimos una fecha de inicio de ciclo $S_i$ como cualquier día registrado donde la menstruación está activa, pero no lo estuvo el día inmediatamente anterior.

Sea $D$ un día del calendario y $\text{periodActive}(D) \in \{\text{true}, \text{false}\}$ el estado del registro de ese día:

$$S_i = \{ D \mid \text{periodActive}(D) = \text{true} \;\land\; (\text{periodActive}(D - 1) = \text{false} \lor D - 1 \notin \text{Registros}) \}$$

El conjunto de todos los inicios ordenado cronológicamente se representa como:
$$S = \{ S_1, S_2, \dots, S_N \}$$
Donde $N$ es el número total de ciclos detectados.

---

## 2. Días Promedio de Ciclo ($L_{\text{ciclo}}$)

La duración de un ciclo individual $C_i$ se define como el número de días transcurridos entre dos inicios de ciclo consecutivos:

$$C_i = \text{días}(S_{i+1} - S_i) \quad \text{para } i \in [1, N-1]$$

Para evitar distorsiones debido a periodos de registro irregulares u olvidos, se filtran las duraciones que caen fuera de los límites biológicos típicos:
$$C_i \text{ es válido si } 15 \le C_i \le 45$$

El promedio de la duración del ciclo ($L_{\text{ciclo}}$) se calcula como la media aritmética de los ciclos válidos:

$$L_{\text{ciclo}} = \frac{1}{M} \sum_{i=1}^{M} C_i$$

Donde $M$ es la cantidad de ciclos válidos calculados.
* *Nota:* Si $M = 0$ (no hay suficientes datos históricos), se asume un valor de referencia predeterminado de **29 días**.

---

## 3. Días Promedio de Regla ($L_{\text{regla}}$)

Para cada inicio de ciclo $S_i$, determinamos la duración del sangrado $R_i$ contando el número de días consecutivos en los que la menstruación se mantuvo activa:

$$R_i = \max \{ d \ge 1 \mid \forall k \in [0, d-1], \, \text{periodActive}(S_i + k) = \text{true} \}$$

La duración promedio de la regla ($L_{\text{regla}}$) es la media de estas duraciones individuales a lo largo de los $N$ ciclos:

$$L_{\text{regla}} = \frac{1}{N} \sum_{i=1}^{N} R_i$$

* *Nota:* Si $N = 0$, se utiliza un valor predeterminado de **5 días**.

---

## 4. Estimación del Próximo Período ($S_{\text{próximo}}$)

La fecha de inicio estimada del próximo período menstrual se proyecta sumando el promedio del ciclo ($L_{\text{ciclo}}$) a la fecha del último inicio registrado ($S_N$):

$$S_{\text{próximo}} = S_N + L_{\text{ciclo}} \text{ días}$$

Los días restantes para el siguiente período se calculan como:
$$\text{Días restantes} = S_{\text{próximo}} - D_{\text{hoy}}$$

---

## 5. Día Más Fértil / Ovulación ($O$)

El día de la ovulación es aquel en el que se libera el óvulo. Biológicamente, la ovulación ocurre aproximadamente **14 días antes** de que comience el siguiente período menstrual.

### Para ciclos pasados:
Para un ciclo histórico delimitado entre el inicio $S_i$ y el siguiente inicio $S_{i+1}$, el día de la ovulación se sitúa en:
$$O_i = S_{i+1} - 14 \text{ días}$$

### Para el próximo ciclo estimado:
Usamos la fecha proyectada de inicio del próximo período para estimar el día de la ovulación futura:
$$O_{\text{próximo}} = S_{\text{próximo}} - 14 \text{ días} = S_N + L_{\text{ciclo}} - 14 \text{ días}$$

---

## 6. Ventana de Fertilidad ($V_{\text{fértil}}$)

El periodo fértil de la mujer está determinado por la vida media del óvulo (aproximadamente 24 horas) y el tiempo de supervivencia de los espermatozoides dentro del tracto reproductor femenino (hasta 5 días).

Por lo tanto, la ventana de fertilidad ($V_{\text{fértil}}$) tiene una duración de **6 días**: abarca los **5 días previos** a la ovulación y el **día de la ovulación misma** (día de fertilidad máxima):

$$V_{\text{fértil}} = [O - 5 \text{ días}, \, O]$$

Expresado como un conjunto de días:
$$V_{\text{fértil}} = \{ O - 5, O - 4, O - 3, O - 2, O - 1, O \}$$

---

## Ejemplo Práctico (Basado en los Datos de Demostración)

Tomando como referencia los registros de la aplicación:
* **Último inicio de regla registrado ($S_N$):** 22 de junio de 2026.
* **Duración promedio del ciclo ($L_{\text{ciclo}}$):** 29 días.
* **Duración promedio de la regla ($L_{\text{regla}}$):** 5 días.

### Cálculos realizados:
1. **Próximo período ($S_{\text{próximo}}$):**
   $$S_{\text{próximo}} = 22\text{ de Junio} + 29\text{ días} = 21\text{ de Julio de 2026}$$
2. **Día más fértil / Ovulación ($O_{\text{próximo}}$):**
   $$O_{\text{próximo}} = 21\text{ de Julio} - 14\text{ días} = 7\text{ de Julio de 2026}$$
3. **Ventana de fertilidad ($V_{\text{fértil, próximo}}$):**
   $$V_{\text{fértil}} = [7\text{ de Julio} - 5\text{ días}, \, 7\text{ de Julio}] = \text{del } 2\text{ al } 7\text{ de Julio de 2026}$$
