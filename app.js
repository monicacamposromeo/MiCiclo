// --- State Management ---
let records = {};
let currentCalendarDate = new Date(2026, 5, 30); // Start at June 30, 2026 based on metadata
let fertileDates = new Set();
let ovulationDates = new Set();

// Emojis for symptoms
const symptomEmojis = {
    headache: "🤕 Cansancio/Cabeza",
    bloating: "🎈 Hinchazón",
    mood: "🎭 Humor sensible",
    cramps: "⚡ Pinchazos",
    nipples: "🍒 Pezones sensibles"
};

// --- Mock Data Generator ---
function getMockData() {
    return {
        // Cycle 1: April 25 to May 23, 2026
        "2026-04-25": { periodActive: true, painLevel: 2, symptoms: ["cramps", "bloating"], notes: "Inicio del ciclo, bastante cansancio." },
        "2026-04-26": { periodActive: true, painLevel: 3, symptoms: ["cramps", "headache"], notes: "Flujo abundante, dolor fuerte por la mañana." },
        "2026-04-27": { periodActive: true, painLevel: 1, symptoms: ["bloating"], notes: "Dolor mucho más leve. Tomé un té caliente." },
        "2026-04-28": { periodActive: true, painLevel: 0, symptoms: [], notes: "Poco flujo. Vuelta a la normalidad." },
        "2026-04-29": { periodActive: true, painLevel: 0, symptoms: [], notes: "Fin del período." },
        // Cycle 1 Day 9: May 3 (to trigger headache prediction on Day 9)
        "2026-05-03": { periodActive: false, painLevel: 0, symptoms: ["headache"], notes: "Dolor de cabeza ligero por la tarde." },
        // Cycle 1 Premenstrual days: 3 and 2 days before next start (May 24)
        "2026-05-21": { periodActive: false, painLevel: 1, symptoms: ["headache", "bloating"], notes: "Hinchazón de vientre y dolor de cabeza." },
        "2026-05-22": { periodActive: false, painLevel: 2, symptoms: ["headache", "mood"], notes: "Bastante dolor de cabeza e irritabilidad." },
        
        // Cycle 2: May 24 to June 21, 2026
        "2026-05-24": { periodActive: true, painLevel: 1, symptoms: ["cramps"], notes: "Manchado inicial suave." },
        "2026-05-25": { periodActive: true, painLevel: 2, symptoms: ["cramps", "mood"], notes: "Dolor medio, humor muy sensible y antojos." },
        "2026-05-26": { periodActive: true, painLevel: 2, symptoms: ["bloating", "headache"], notes: "Hinchada y con sueño." },
        "2026-05-27": { periodActive: true, painLevel: 1, symptoms: ["cramps"], notes: "Casi terminado." },
        "2026-05-28": { periodActive: true, painLevel: 0, symptoms: [], notes: "Último día de regla." },
        // Cycle 2 Day 9: June 1 (to trigger headache and nipples predictions on Day 9)
        "2026-06-01": { periodActive: false, painLevel: 0, symptoms: ["headache", "nipples"], notes: "Pezones algo sensibles y molestia de cabeza." },
        // Cycle 2 Premenstrual days: 3 and 2 days before next start (June 22)
        "2026-06-19": { periodActive: false, painLevel: 1, symptoms: ["headache", "bloating"], notes: "Hinchazón y cansancio." },
        "2026-06-20": { periodActive: false, painLevel: 2, symptoms: ["headache", "mood"], notes: "Pinchazos y dolor de cabeza fuerte." },
        
        // Cycle 3: June 22 to June 26, 2026 (current cycle in progress)
        "2026-06-22": { periodActive: true, painLevel: 2, symptoms: ["cramps"], notes: "Comenzó por la tarde. Molestias en la zona lumbar." },
        "2026-06-23": { periodActive: true, painLevel: 3, symptoms: ["cramps", "headache", "bloating"], notes: "Día difícil. Dolor de cabeza fuerte e hinchazón." },
        "2026-06-24": { periodActive: true, painLevel: 2, symptoms: ["cramps", "mood"], notes: "Dolor de ovarios intermitente." },
        "2026-06-25": { periodActive: true, painLevel: 1, symptoms: ["bloating"], notes: "Mejoría notable." },
        "2026-06-26": { periodActive: true, painLevel: 0, symptoms: [], notes: "Últimos restos." }
    };
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    // Load from localStorage or initialize mock data
    const saved = localStorage.getItem("miciclo_records");
    if (saved) {
        records = JSON.parse(saved);
        // Refresh mock data if it's the old version without May 21 symptoms to demonstrate predictions immediately
        if (!records["2026-05-21"] && records["2026-04-25"]) {
            records = getMockData();
            saveRecords();
        }
    } else {
        records = getMockData();
        saveRecords();
    }

    // Set today's date in form (June 30, 2026 as per local metadata)
    const todayStr = "2026-06-30";
    document.getElementById("record-date").value = todayStr;
    document.getElementById("record-date").max = todayStr; // Prevent future logs beyond today

    // Initialize UI Components
    initTabs();
    initForm();
    initCalendarNav();
    initModal();
    
    // Initial Render
    updateUI();
});

function saveRecords() {
    localStorage.setItem("miciclo_records", JSON.stringify(records));
}

// --- Tab Switching Navigation ---
function initTabs() {
    const tabButtons = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");

            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            button.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
            
            // Re-render calendar to adjust grid sizing if entering calendar tab
            if (targetTab === "calendario-tab") {
                renderCalendar();
            }
        });
    });
}

// --- Form Handling ---
function initForm() {
    const dateInput = document.getElementById("record-date");
    const periodActiveInput = document.getElementById("period-active");
    const painRadios = document.getElementsByName("pain-level");
    const symptomsCheckboxes = document.getElementsByName("symptoms");
    const notesInput = document.getElementById("record-notes");
    const form = document.getElementById("period-form");

    // Load existing record values when date changes
    dateInput.addEventListener("change", () => {
        loadRecordIntoForm(dateInput.value);
    });

    // Handle form submit
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const dateVal = dateInput.value;
        if (!dateVal) return;

        // Get selected symptoms
        const selectedSymptoms = [];
        symptomsCheckboxes.forEach(cb => {
            if (cb.checked) selectedSymptoms.push(cb.value);
        });

        // Get selected pain level
        let selectedPain = 0;
        painRadios.forEach(radio => {
            if (radio.checked) selectedPain = parseInt(radio.value);
        });

        // Update record state
        records[dateVal] = {
            periodActive: periodActiveInput.checked,
            painLevel: selectedPain,
            symptoms: selectedSymptoms,
            notes: notesInput.value.trim()
        };

        saveRecords();
        updateUI();
        showToast("Registro guardado con éxito 🌸");
    });

    // Initial load for default date (today)
    loadRecordIntoForm(dateInput.value);
}

function loadRecordIntoForm(dateStr) {
    const periodActiveInput = document.getElementById("period-active");
    const painRadios = document.getElementsByName("pain-level");
    const symptomsCheckboxes = document.getElementsByName("symptoms");
    const notesInput = document.getElementById("record-notes");

    const record = records[dateStr];

    if (record) {
        periodActiveInput.checked = record.periodActive;
        
        painRadios.forEach(radio => {
            radio.checked = parseInt(radio.value) === record.painLevel;
        });

        symptomsCheckboxes.forEach(cb => {
            cb.checked = record.symptoms.includes(cb.value);
        });

        notesInput.value = record.notes || "";
    } else {
        // Reset form for empty date
        periodActiveInput.checked = false;
        painRadios.forEach(radio => {
            radio.checked = parseInt(radio.value) === 0; // default no pain
        });
        symptomsCheckboxes.forEach(cb => {
            cb.checked = false;
        });
        notesInput.value = "";
    }
}

// --- Updates and Statistics Calculation ---
function updateUI() {
    // 1. Calculate Statistics
    const stats = calculateCycleStats();
    
    // Update Sidebar / Header info
    updateHeaderStats(stats);
    
    // Update Stats Card in Calendar Tab
    document.getElementById("avg-cycle-length").textContent = stats.avgCycleLength ? `${stats.avgCycleLength} d` : "--";
    document.getElementById("avg-period-length").textContent = stats.avgPeriodLength ? `${stats.avgPeriodLength} d` : "--";
    
    if (stats.nextPeriodEstDate) {
        const formattedNextDate = formatDateLong(stats.nextPeriodEstDate);
        document.getElementById("next-period-est").textContent = formattedNextDate;
    } else {
        document.getElementById("next-period-est").textContent = "Más registros necesarios";
    }

    if (stats.nextOvulationEstDate) {
        const formattedOvulationDate = formatDateLong(stats.nextOvulationEstDate);
        document.getElementById("next-ovulation-est").textContent = formattedOvulationDate;
    } else {
        document.getElementById("next-ovulation-est").textContent = "Más registros necesarios";
    }

    // 2. Render History List
    renderHistory();

    // 3. Render Calendar
    renderCalendar(stats);

    // 4. Update Hoy Screen
    updateTodayTab(stats);

    // 5. Update Cycle Wheel Card
    updateCycleWheel(stats);

    // 6. Update Symptom Predictions
    updateSymptomPredictions(stats);
}

function calculateCycleStats() {
    // Extract sorted dates
    const recordDates = Object.keys(records).sort();
    if (recordDates.length === 0) {
        return { avgCycleLength: 28, avgPeriodLength: 5, startDates: [], nextPeriodEstDate: null, nextOvulationEstDate: null };
    }

    // Find cycle start dates (a day with period active where the previous day is not active/logged)
    const startDates = [];
    recordDates.forEach((dateStr, idx) => {
        if (records[dateStr].periodActive) {
            const prevDateStr = getAdjacentDateStr(dateStr, -1);
            const wasPrevActive = records[prevDateStr] && records[prevDateStr].periodActive;
            
            if (!wasPrevActive) {
                startDates.push(dateStr);
            }
        }
    });

    // 1. Calculate Cycle Length (Difference between start dates)
    let cycleLengths = [];
    for (let i = 1; i < startDates.length; i++) {
        const diffDays = getDaysDifference(startDates[i - 1], startDates[i]);
        // Filter out anomalies (e.g. cycles too short or too long due to sparse logging)
        if (diffDays >= 15 && diffDays <= 45) {
            cycleLengths.push(diffDays);
        }
    }
    
    const avgCycleLength = cycleLengths.length > 0 
        ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
        : 29; // default fallback

    // 2. Calculate Period Length (Consecutive period active days)
    let periodLengths = [];
    startDates.forEach(startDate => {
        let count = 1;
        let nextDateStr = getAdjacentDateStr(startDate, 1);
        while (records[nextDateStr] && records[nextDateStr].periodActive) {
            count++;
            nextDateStr = getAdjacentDateStr(nextDateStr, 1);
        }
        periodLengths.push(count);
    });

    const avgPeriodLength = periodLengths.length > 0
        ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
        : 5; // default fallback

    // 3. Predict Next Period Start and Ovulation
    let nextPeriodEstDate = null;
    let nextOvulationEstDate = null;
    if (startDates.length > 0) {
        const lastStartDate = startDates[startDates.length - 1];
        const lastStartObj = new Date(lastStartDate + "T00:00:00");
        lastStartObj.setDate(lastStartObj.getDate() + avgCycleLength);
        nextPeriodEstDate = lastStartObj;

        // Ovulation is 14 days before next start
        const ovulationObj = new Date(lastStartObj);
        ovulationObj.setDate(ovulationObj.getDate() - 14);
        nextOvulationEstDate = ovulationObj;
    }

    // Populate fertility sets
    fertileDates.clear();
    ovulationDates.clear();

    if (startDates.length > 0) {
        // 1. Process past cycles
        for (let i = 0; i < startDates.length; i++) {
            const currentStart = startDates[i];
            let nextStartStr = "";
            if (i < startDates.length - 1) {
                nextStartStr = startDates[i + 1];
            } else if (nextPeriodEstDate) {
                nextStartStr = formatDateKey(nextPeriodEstDate);
            }

            if (nextStartStr) {
                const nextStartObj = new Date(nextStartStr + "T00:00:00");
                
                const ovulationObj = new Date(nextStartObj);
                ovulationObj.setDate(ovulationObj.getDate() - 14);
                const ovulationStr = formatDateKey(ovulationObj);
                ovulationDates.add(ovulationStr);

                for (let offset = -5; offset <= 0; offset++) {
                    const fertileDayObj = new Date(ovulationObj);
                    fertileDayObj.setDate(fertileDayObj.getDate() + offset);
                    fertileDates.add(formatDateKey(fertileDayObj));
                }
            }
        }

        // 2. Generate future predicted cycles
        if (nextPeriodEstDate) {
            let futureNextStart = new Date(nextPeriodEstDate);
            for (let cycleNum = 0; cycleNum < 3; cycleNum++) {
                const nextCycleStartObj = new Date(futureNextStart);
                nextCycleStartObj.setDate(nextCycleStartObj.getDate() + avgCycleLength);
                
                const ovulationObj = new Date(nextCycleStartObj);
                ovulationObj.setDate(ovulationObj.getDate() - 14);
                const ovulationStr = formatDateKey(ovulationObj);
                ovulationDates.add(ovulationStr);

                for (let offset = -5; offset <= 0; offset++) {
                    const fertileDayObj = new Date(ovulationObj);
                    fertileDayObj.setDate(fertileDayObj.getDate() + offset);
                    fertileDates.add(formatDateKey(fertileDayObj));
                }

                futureNextStart = nextCycleStartObj;
            }
        }
    }

    return {
        avgCycleLength,
        avgPeriodLength,
        startDates,
        nextPeriodEstDate,
        nextOvulationEstDate
    };
}

function updateHeaderStats(stats) {
    const todayStr = "2026-06-30"; // Current date in app context
    const dateDisplay = document.getElementById("current-date-display");
    const statusText = document.getElementById("quick-status-text");
    const statusCard = document.getElementById("quick-status-card");

    // Display formatted today's date if element exists
    if (dateDisplay) {
        dateDisplay.textContent = formatDateLong(new Date(todayStr + "T00:00:00"));
    }

    // Check if period is active today
    if (records[todayStr] && records[todayStr].periodActive) {
        statusText.textContent = "Menstruación activa 🩸";
        statusCard.style.borderColor = "var(--primary)";
        statusCard.querySelector(".pulse-dot").style.backgroundColor = "var(--primary)";
        return;
    }

    // Otherwise, find out days since last period or days until next period
    if (stats.startDates.length > 0) {
        const lastStart = stats.startDates[stats.startDates.length - 1];
        const lastStartObj = new Date(lastStart + "T00:00:00");
        const todayObj = new Date(todayStr + "T00:00:00");

        const daysSinceStart = Math.floor((todayObj - lastStartObj) / (1000 * 60 * 60 * 24));

        if (daysSinceStart >= 0 && daysSinceStart < stats.avgCycleLength) {
            const daysLeft = stats.avgCycleLength - daysSinceStart;
            
            // Check if we are close to the next cycle (within 3 days)
            if (daysLeft <= 3) {
                statusText.textContent = `Regla en ${daysLeft} días (aprox) 🌸`;
                statusCard.style.borderColor = "var(--primary)";
                statusCard.querySelector(".pulse-dot").style.backgroundColor = "var(--primary)";
            } else {
                statusText.textContent = `Día ${daysSinceStart + 1} del ciclo (Fase Lútea)`;
                statusCard.style.borderColor = "var(--border-color)";
                statusCard.querySelector(".pulse-dot").style.backgroundColor = "var(--secondary)";
            }
        } else {
            // Overdue
            statusText.textContent = "Retraso estimado del período";
            statusCard.style.borderColor = "var(--pain-3)";
            statusCard.querySelector(".pulse-dot").style.backgroundColor = "var(--pain-3)";
        }
    } else {
        statusText.textContent = "Sin datos de ciclo registrados";
        statusCard.style.borderColor = "var(--border-color)";
        statusCard.querySelector(".pulse-dot").style.backgroundColor = "var(--secondary)";
    }
}

// --- History List Rendering ---
function renderHistory() {
    const emptyState = document.getElementById("history-empty");
    const container = document.getElementById("history-items");
    
    // Clear container
    container.innerHTML = "";

    const sortedDates = Object.keys(records).sort().reverse();

    if (sortedDates.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    sortedDates.forEach(dateStr => {
        const record = records[dateStr];
        const itemDiv = document.createElement("div");
        itemDiv.className = `history-item ${record.periodActive ? 'period-active' : ''}`;

        const painLabels = ["Sin dolor", "Dolor Leve", "Dolor Moderado", "Dolor Fuerte"];
        const painLabel = painLabels[record.painLevel];
        
        // Format symptoms list
        let symptomsHtml = "";
        if (record.symptoms && record.symptoms.length > 0) {
            const list = record.symptoms.map(s => symptomEmojis[s] ? symptomEmojis[s].split(" ")[0] : "").join(" ");
            symptomsHtml = `<span class="symptoms-indicator">${list}</span>`;
        }

        const dateObj = new Date(dateStr + "T00:00:00");
        const formattedDate = formatDateShort(dateObj);

        itemDiv.innerHTML = `
            <div class="history-item-left">
                <div class="history-status-indicator">
                    ${record.periodActive ? '🩸' : '🌸'}
                </div>
                <div class="history-item-info">
                    <span class="history-date">${formattedDate}</span>
                    <div class="history-details">
                        <span class="pain-badge pain-level-${record.painLevel}">${painLabel}</span>
                        ${symptomsHtml}
                        ${record.notes ? `<span class="history-notes" title="${record.notes}">💬 ${record.notes}</span>` : ""}
                    </div>
                </div>
            </div>
            <button class="btn-delete" title="Borrar registro" data-date="${dateStr}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        // Delete button event
        itemDiv.querySelector(".btn-delete").addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(`¿Estás seguro de que quieres borrar el registro del ${formattedDate}?`)) {
                deleteRecord(dateStr);
            }
        });

        // Click on item to edit in form
        itemDiv.addEventListener("click", () => {
            const dateInput = document.getElementById("record-date");
            dateInput.value = dateStr;
            loadRecordIntoForm(dateStr);
            // Switch to Diario y Registro tab (if not already active)
            const tabBtn = document.querySelector('[data-tab="registro-tab"]');
            if (tabBtn) tabBtn.click();
            // Pulse animation on the form card to highlight it
            const formCard = document.querySelector(".card-form");
            formCard.style.transform = "scale(1.02)";
            setTimeout(() => { formCard.style.transform = "none"; }, 300);
        });

        container.appendChild(itemDiv);
    });
}

function deleteRecord(dateStr) {
    delete records[dateStr];
    saveRecords();
    updateUI();
    // If deleted date was loaded in the form, refresh form
    const dateInput = document.getElementById("record-date");
    if (dateInput.value === dateStr) {
        loadRecordIntoForm(dateStr);
    }
    showToast("Registro eliminado");
}

// --- Calendar Rendering and Management ---
function initCalendarNav() {
    document.getElementById("prev-month").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById("next-month").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById("go-to-today").addEventListener("click", () => {
        currentCalendarDate = new Date(2026, 5, 30); // reset to context today
        renderCalendar();
        showToast("Volviendo al día de hoy 📅");
    });
}

function renderCalendar(stats = null) {
    if (!stats) {
        stats = calculateCycleStats();
    }

    const grid = document.getElementById("calendar-grid");
    const headerTitle = document.getElementById("calendar-month-year");
    
    // Clear grid
    grid.innerHTML = "";

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    // Format header title (e.g. "Junio 2026")
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    headerTitle.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // We adjust it so that Monday is 0, Sunday is 6
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay() - 1; 
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday is 6 in our system

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Render empty spaces for previous month's weekdays
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        grid.appendChild(emptyCell);
    }

    // Prediction calculation helpers
    const predictionPeriods = [];
    if (stats.nextPeriodEstDate && stats.avgPeriodLength) {
        // Predict current month's and next month's periods based on the latest start date
        let predStart = new Date(stats.nextPeriodEstDate);
        
        // Generate up to 3 predictions forward to cover the visible calendar month
        for (let cycleNum = 0; cycleNum < 3; cycleNum++) {
            const startPred = new Date(predStart);
            const endPred = new Date(startPred);
            endPred.setDate(endPred.getDate() + stats.avgPeriodLength - 1);
            
            predictionPeriods.push({ start: startPred, end: endPred });
            
            // Advance prediction for the next cycle
            predStart.setDate(predStart.getDate() + stats.avgCycleLength);
        }
    }

    const todayStr = "2026-06-30"; // Context current date

    // Render days of the month
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day";

        // Date String construction
        const dayStr = String(day).padStart(2, "0");
        const monthStr = String(month + 1).padStart(2, "0");
        const dateKey = `${year}-${monthStr}-${dayStr}`;
        const dayDate = new Date(year, month, day);

        // Day Number
        const numSpan = document.createElement("span");
        numSpan.className = "day-number";
        numSpan.textContent = day;
        cell.appendChild(numSpan);

        // Check if date is in records
        const record = records[dateKey];
        let hasPeriod = false;
        let painVal = 0;

        if (record) {
            hasPeriod = record.periodActive;
            painVal = record.painLevel;
            
            if (hasPeriod) {
                cell.classList.add("period");
            } else {
                if (ovulationDates.has(dateKey)) {
                    cell.classList.add("ovulation");
                    const starSpan = document.createElement("span");
                    starSpan.className = "ovulation-badge";
                    starSpan.textContent = "✨";
                    starSpan.style.position = "absolute";
                    starSpan.style.top = "6px";
                    starSpan.style.right = "6px";
                    starSpan.style.fontSize = "0.75rem";
                    cell.appendChild(starSpan);
                } else if (fertileDates.has(dateKey)) {
                    cell.classList.add("fertile");
                }
            }

            // Render indicators (pain level)
            if (painVal > 0) {
                const indDiv = document.createElement("div");
                indDiv.className = "day-indicators";
                
                const dot = document.createElement("span");
                dot.className = `indicator-pain pain-${painVal}`;
                indDiv.appendChild(dot);
                cell.appendChild(indDiv);
            }
        } else {
            // Check if day is predicted period
            let isPredicted = false;
            for (let pred of predictionPeriods) {
                if (dayDate >= pred.start && dayDate <= pred.end) {
                    isPredicted = true;
                    break;
                }
            }

            if (isPredicted) {
                cell.classList.add("prediction");
            } else if (ovulationDates.has(dateKey)) {
                cell.classList.add("ovulation");
                const starSpan = document.createElement("span");
                starSpan.className = "ovulation-badge";
                starSpan.textContent = "✨";
                starSpan.style.position = "absolute";
                starSpan.style.top = "6px";
                starSpan.style.right = "6px";
                starSpan.style.fontSize = "0.75rem";
                cell.appendChild(starSpan);
            } else if (fertileDates.has(dateKey)) {
                cell.classList.add("fertile");
            }
        }

        // Today highlight
        if (dateKey === todayStr) {
            cell.classList.add("today");
            cell.title = "Hoy";
        }

        // Click Event: Open Modal details
        cell.addEventListener("click", () => {
            openDayDetailsModal(dateKey, record, cell.classList.contains("prediction"));
        });

        grid.appendChild(cell);
    }
}

// --- Modal Functionality ---
function initModal() {
    const modal = document.getElementById("day-modal");
    const closeBtn = document.getElementById("close-modal");

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // Close on click outside content
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
}

function openDayDetailsModal(dateStr, record, isPredicted) {
    const modal = document.getElementById("day-modal");
    const title = document.getElementById("modal-date-title");
    const body = document.getElementById("modal-details-body");
    const editBtn = document.getElementById("modal-edit-btn");
    const deleteBtn = document.getElementById("modal-delete-btn");

    const dateObj = new Date(dateStr + "T00:00:00");
    title.textContent = formatDateLong(dateObj);
    
    body.innerHTML = "";

    const isOvulationDay = ovulationDates.has(dateStr);
    const isFertileDay = fertileDates.has(dateStr);

    if (record) {
        deleteBtn.classList.remove("hidden");
        editBtn.textContent = "Editar Registro";

        // Period Active state
        const periodItem = document.createElement("div");
        periodItem.className = "modal-detail-item";
        periodItem.innerHTML = `
            <span class="modal-detail-label">Menstruación:</span>
            <span class="modal-detail-value">${record.periodActive ? '🩸 Activa' : '❌ Inactiva'}</span>
        `;
        body.appendChild(periodItem);

        // Pain Level
        const painLabels = ["Sin dolor", "Leve", "Moderado", "Fuerte"];
        const painColors = ["var(--pain-0)", "var(--pain-1)", "var(--pain-2)", "var(--pain-3)"];
        const painItem = document.createElement("div");
        painItem.className = "modal-detail-item";
        painItem.innerHTML = `
            <span class="modal-detail-label">Dolor Menstrual:</span>
            <span class="modal-detail-value" style="color: ${painColors[record.painLevel]}">${painLabels[record.painLevel]}</span>
        `;
        body.appendChild(painItem);

        // Fertility details if active
        if (!record.periodActive && (isOvulationDay || isFertileDay)) {
            const fertItem = document.createElement("div");
            fertItem.className = "modal-detail-item";
            if (isOvulationDay) {
                fertItem.innerHTML = `
                    <span class="modal-detail-label">Fertilidad:</span>
                    <span class="modal-detail-value" style="color: #8E44AD; font-weight: 800;">✨ Ovulación (Máxima)</span>
                `;
            } else {
                fertItem.innerHTML = `
                    <span class="modal-detail-label">Fertilidad:</span>
                    <span class="modal-detail-value" style="color: #B185DB; font-weight: 700;">💜 Ventana Fértil (Alta)</span>
                `;
            }
            body.appendChild(fertItem);
        }

        // Symptoms
        if (record.symptoms && record.symptoms.length > 0) {
            const symItem = document.createElement("div");
            symItem.className = "modal-detail-item";
            const names = record.symptoms.map(s => symptomEmojis[s] || s).join(", ");
            symItem.innerHTML = `
                <span class="modal-detail-label">Síntomas:</span>
                <span class="modal-detail-value">${names}</span>
            `;
            body.appendChild(symItem);
        }

        // Notes
        if (record.notes) {
            const notesItem = document.createElement("div");
            notesItem.className = "modal-notes-box";
            notesItem.textContent = `"${record.notes}"`;
            body.appendChild(notesItem);
        }

        // Action Handlers
        // Delete action
        deleteBtn.onclick = () => {
            if (confirm("¿Estás seguro de que quieres borrar este registro?")) {
                deleteRecord(dateStr);
                modal.classList.add("hidden");
            }
        };

        // Edit action
        editBtn.onclick = () => {
            const dateInput = document.getElementById("record-date");
            dateInput.value = dateStr;
            loadRecordIntoForm(dateStr);
            
            // Switch tabs
            const tabBtn = document.querySelector('[data-tab="registro-tab"]');
            if (tabBtn) tabBtn.click();
            
            modal.classList.add("hidden");

            // Focus on form card
            const formCard = document.querySelector(".card-form");
            formCard.style.transform = "scale(1.02)";
            setTimeout(() => { formCard.style.transform = "none"; }, 300);
        };

    } else {
        // No record logged
        deleteBtn.classList.add("hidden");
        editBtn.textContent = "Añadir Registro";

        const textMsg = document.createElement("p");
        textMsg.style.color = "var(--text-muted)";
        
        if (isPredicted) {
            textMsg.innerHTML = "📅 No hay registros para este día, pero <strong>se estima que podrías estar con la regla</strong> según tus promedios.";
        } else if (isOvulationDay) {
            textMsg.innerHTML = "✨ No hay registros para este día, pero según tus promedios, hoy es tu <strong>Día de Ovulación (Fertilidad Máxima)</strong>.";
        } else if (isFertileDay) {
            textMsg.innerHTML = "💜 No hay registros para este día, pero según tus promedios, te encuentras en tu <strong>Ventana de Fertilidad (Fertilidad Alta)</strong>.";
        } else {
            textMsg.textContent = "No tienes ningún registro guardado para este día.";
        }
        body.appendChild(textMsg);

        // Add Record action
        editBtn.onclick = () => {
            const dateInput = document.getElementById("record-date");
            dateInput.value = dateStr;
            loadRecordIntoForm(dateStr);
            
            // Switch tabs
            const tabBtn = document.querySelector('[data-tab="registro-tab"]');
            if (tabBtn) tabBtn.click();
            
            modal.classList.add("hidden");
        };
    }

    modal.classList.remove("hidden");
}

// --- Helper Functions ---
function getAdjacentDateStr(dateStr, offsetDays) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + offsetDays);
    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${monthStr}-${dayStr}`;
}

function getDaysDifference(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + "T00:00:00");
    const d2 = new Date(dateStr2 + "T00:00:00");
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function formatDateLong(dateObj) {
    // Returns formatted date like: "Martes, 30 de Junio de 2026"
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const dayName = days[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${dayName}, ${dayNum} de ${monthName} de ${year}`;
}

function formatDateShort(dateObj) {
    // Returns: "30 Jun 2026" or "30/06"
    const monthsShort = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${dateObj.getDate()} ${monthsShort[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    
    // Clear any previous timeout if we click repeatedly
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }

    window.toastTimeout = setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

function formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function updateTodayTab(stats) {
    const todayStr = "2026-06-30"; // App context today
    const todayObj = new Date(todayStr + "T00:00:00");
    
    // Select HTML elements
    const phaseBadge = document.getElementById("hoy-phase-badge");
    const phaseTitle = document.getElementById("hoy-phase-title");
    const cycleDayText = document.getElementById("hoy-cycle-day");
    const phaseAdvice = document.getElementById("hoy-phase-advice");
    
    const nextPhaseBadge = document.getElementById("next-phase-badge");
    const nextPhaseName = document.getElementById("next-phase-name");
    const nextPhaseEta = document.getElementById("next-phase-eta");
    const todayLogStatus = document.getElementById("today-log-status");

    // Phase descriptions
    const advices = {
        menstrual: "Tu cuerpo está desprendiendo el revestimiento uterino. Es normal experimentar cansancio, cólicos o sensibilidad emocional. Prioriza el descanso, consume comidas cálidas y ricas en hierro, e hidrátate bien. Evita entrenamientos exigentes; opta por estiramientos ligeros, yoga suave o caminatas tranquilas.",
        folicular: "Los niveles de estrógeno comienzan a elevarse de forma gradual, estimulando la maduración de los folículos. Tu energía física y claridad mental aumentan notablemente. Es el momento perfecto para emprender nuevos proyectos, planificar actividades sociales y realizar entrenamientos intensos de cardio o fuerza.",
        ovulacion: "El óvulo es liberado para su potencial fertilización. Tus niveles de estrógeno y testosterona alcanzan su pico más alto en todo el ciclo, brindándote un brillo radiante, alta confianza y energía social. Es el momento idóneo para presentaciones importantes, comunicación y actividades interpersonales.",
        lutea: "La progesterona se convierte en la hormona dominante para preparar el útero. Es común notar una disminución progresiva de la energía corporal y la aparición de síntomas premenstruales (hinchazón abdominal, irritabilidad, antojos). Practica el autocuidado activo, baja el ritmo de actividad física y prioriza horas de sueño de calidad."
    };

    // Calculate current cycle day
    let lastStartStr = null;
    if (stats.startDates.length > 0) {
        // Find the latest start date that is <= today
        for (let i = stats.startDates.length - 1; i >= 0; i--) {
            const startDateStr = stats.startDates[i];
            if (startDateStr <= todayStr) {
                lastStartStr = startDateStr;
                break;
            }
        }
    }

    if (!lastStartStr) {
        // Fallback state if no history is logged
        phaseBadge.className = "phase-badge phase-folicular";
        phaseBadge.textContent = "Sin datos";
        phaseTitle.textContent = "Introduce tu registro";
        cycleDayText.textContent = "Comienza registrando tu ciclo";
        phaseAdvice.textContent = "Registra cuándo comenzó tu última regla en la pestaña 'Diario y Registro' para que podamos calcular las fases de tu ciclo menstrual y ofrecerte consejos personalizados.";
        
        nextPhaseBadge.style.display = "none";
        nextPhaseName.textContent = "Faltan registros";
        nextPhaseEta.textContent = "Registra al menos un período";
        
        renderTodayEmptySummary();
        return;
    }

    const L_cycle = stats.avgCycleLength || 29;
    const L_period = stats.avgPeriodLength || 5;
    const ovulationDay = L_cycle - 14; // e.g. Day 15 for a 29-day cycle

    const diffDays = getDaysDifference(lastStartStr, todayStr);
    const cycleDay = diffDays + 1; // 1-indexed

    // Phase classification and ranges
    let currentPhase = "folicular";
    let phaseDaysStart = 1;
    let phaseDaysEnd = L_cycle;

    if (cycleDay <= L_period) {
        currentPhase = "menstrual";
        phaseDaysStart = 1;
        phaseDaysEnd = L_period;
    } else if (cycleDay < ovulationDay) {
        currentPhase = "folicular";
        phaseDaysStart = L_period + 1;
        phaseDaysEnd = ovulationDay - 1;
    } else if (cycleDay <= ovulationDay + 1) {
        currentPhase = "ovulacion";
        phaseDaysStart = ovulationDay;
        phaseDaysEnd = ovulationDay + 1;
    } else {
        currentPhase = "lutea";
        phaseDaysStart = ovulationDay + 2;
        phaseDaysEnd = L_cycle;
    }

    const phaseDuration = phaseDaysEnd - phaseDaysStart + 1;
    let dayOfPhase = cycleDay - phaseDaysStart + 1;
    if (cycleDay > L_cycle) {
        dayOfPhase = phaseDuration; // Cap if cycle is overdue
    }

    let daysRemaining = phaseDaysEnd - cycleDay + 1;
    if (daysRemaining < 0) {
        daysRemaining = 0; // Overdue
    }

    // 1. Update Phase Badge and Title
    phaseBadge.textContent = `Fase ${currentPhase === 'ovulacion' ? 'Ovulación' : currentPhase}`;
    phaseBadge.className = `phase-badge phase-${currentPhase}`;
    
    const phaseNiceNames = {
        menstrual: "Fase Menstrual 🩸",
        folicular: "Fase Folicular 🌱",
        ovulacion: "Fase de Ovulación ✨",
        lutea: "Fase Lútea 🌾"
    };
    if (phaseTitle) phaseTitle.textContent = phaseNiceNames[currentPhase];
    if (cycleDayText) cycleDayText.textContent = `Día ${cycleDay} del ciclo (Duración promedio: ${L_cycle} días)`;

    // 2. Update advice text
    if (phaseAdvice) phaseAdvice.textContent = advices[currentPhase];

    // 4. Update Next Phase prediction
    let nextPhaseCode = "folicular";
    let nextPhaseStartDay = L_period + 1;

    if (currentPhase === "menstrual") {
        nextPhaseCode = "folicular";
        nextPhaseStartDay = L_period + 1;
    } else if (currentPhase === "folicular") {
        nextPhaseCode = "ovulacion";
        nextPhaseStartDay = ovulationDay;
    } else if (currentPhase === "ovulacion") {
        nextPhaseCode = "lutea";
        nextPhaseStartDay = ovulationDay + 2;
    } else if (currentPhase === "lutea") {
        nextPhaseCode = "menstrual";
        nextPhaseStartDay = L_cycle + 1;
    }

    let daysUntilNext = nextPhaseStartDay - cycleDay;
    if (daysUntilNext < 0) daysUntilNext = 1; // Fallback for overdue cycles

    nextPhaseBadge.style.display = "inline-block";
    nextPhaseBadge.className = `phase-badge-next phase-${nextPhaseCode}`;
    nextPhaseBadge.textContent = nextPhaseCode === 'ovulacion' ? 'Ovulación' : nextPhaseCode;
    
    const nextPhaseNiceNames = {
        menstrual: "Fase Menstrual 🩸",
        folicular: "Fase Folicular 🌱",
        ovulacion: "Fase de Ovulación ✨",
        lutea: "Fase Lútea 🌾"
    };
    nextPhaseName.textContent = nextPhaseNiceNames[nextPhaseCode];
    
    const lastStartObj = new Date(lastStartStr + "T00:00:00");
    if (nextPhaseCode === "menstrual" && stats.nextPeriodEstDate) {
        nextPhaseEta.textContent = `En aprox. ${daysUntilNext} ${daysUntilNext === 1 ? 'día' : 'días'} (estimado para el ${formatDateShort(stats.nextPeriodEstDate)})`;
    } else {
        const nextPhaseDate = new Date(lastStartObj);
        nextPhaseDate.setDate(nextPhaseDate.getDate() + nextPhaseStartDay - 1);
        nextPhaseEta.textContent = `En aprox. ${daysUntilNext} ${daysUntilNext === 1 ? 'día' : 'días'} (el ${formatDateShort(nextPhaseDate)})`;
    }

    // 5. Update Today's Diary Summary card
    const todayRecord = records[todayStr];
    todayLogStatus.innerHTML = "";

    if (todayRecord) {
        const painLabels = ["Sin dolor", "Dolor Leve", "Dolor Moderado", "Dolor Fuerte"];
        let symptomsHtml = "";
        if (todayRecord.symptoms && todayRecord.symptoms.length > 0) {
            const list = todayRecord.symptoms.map(s => symptomEmojis[s] || s).join(", ");
            symptomsHtml = `
                <div class="today-summary-item">
                    <span class="today-summary-label">Síntomas:</span>
                    <span class="today-summary-value">${list}</span>
                </div>
            `;
        }

        const summaryContent = document.createElement("div");
        summaryContent.className = "today-summary-details";
        summaryContent.innerHTML = `
            <div class="today-summary-item">
                <span class="today-summary-label">Menstruación:</span>
                <span class="today-summary-value">${todayRecord.periodActive ? '🩸 Activa' : '❌ Inactiva'}</span>
            </div>
            <div class="today-summary-item">
                <span class="today-summary-label">Dolor Menstrual:</span>
                <span class="today-summary-value">
                    <span class="pain-badge pain-level-${todayRecord.painLevel}">${painLabels[todayRecord.painLevel]}</span>
                </span>
            </div>
            ${symptomsHtml}
            ${todayRecord.notes ? `<div class="today-summary-notes">"${todayRecord.notes}"</div>` : ""}
            <button id="hoy-edit-btn" class="btn btn-secondary" style="width: 100%; margin-top: 10px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
                Editar diario de hoy
            </button>
        `;

        summaryContent.querySelector("#hoy-edit-btn").addEventListener("click", () => {
            // Set date to today and nav to diary tab
            const dateInput = document.getElementById("record-date");
            dateInput.value = todayStr;
            loadRecordIntoForm(todayStr);
            document.querySelector('[data-tab="registro-tab"]').click();
        });

        todayLogStatus.appendChild(summaryContent);
    } else {
        renderTodayEmptySummary();
    }
}

function renderTodayEmptySummary() {
    const todayStr = "2026-06-30";
    const todayLogStatus = document.getElementById("today-log-status");
    todayLogStatus.innerHTML = "";

    const emptyBox = document.createElement("div");
    emptyBox.className = "today-empty-log";
    emptyBox.innerHTML = `
        <p>No tienes ningún síntoma o regla registrada para el día de hoy.</p>
        <button id="hoy-record-btn" class="btn btn-primary" style="width: 100%;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            Registrar hoy
        </button>
    `;

    emptyBox.querySelector("#hoy-record-btn").addEventListener("click", () => {
        const dateInput = document.getElementById("record-date");
        dateInput.value = todayStr;
        loadRecordIntoForm(todayStr);
        document.querySelector('[data-tab="registro-tab"]').click();
    });

    todayLogStatus.appendChild(emptyBox);
}

// --- Rueda del Ciclo Completo ---
function updateCycleWheel(stats) {
    const todayStr = "2026-06-30"; // App context today
    const svg = document.getElementById("cycle-wheel-svg");
    const dayTotalText = document.getElementById("wheel-day-total");
    const legendContainer = document.getElementById("wheel-legend");
    
    if (!svg) return;

    // Clear previous segments and marker, but keep filters
    const defs = svg.querySelector("defs");
    svg.innerHTML = "";
    if (defs) {
        svg.appendChild(defs);
    } else {
        svg.innerHTML = `
            <defs>
                <filter id="marker-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
                </filter>
            </defs>
        `;
    }

    // Faint background circle track (Low Fertility / Base Track)
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", "100");
    bgCircle.setAttribute("cy", "100");
    bgCircle.setAttribute("r", "85");
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "var(--secondary-light)");
    bgCircle.setAttribute("stroke-width", "10");
    bgCircle.setAttribute("opacity", "0.5");
    bgCircle.setAttribute("class", "wheel-base-track");
    svg.appendChild(bgCircle);

    // Get stats values or fallbacks
    const L_cycle = stats.avgCycleLength || 29;
    const L_period = stats.avgPeriodLength || 5;
    const ovulationDay = L_cycle - 14; // Day 15 for 29-day cycle

    // Fertile Window: Days (ovulationDay - 5) to ovulationDay.
    const fertileStart = ovulationDay - 5;
    const fertileEnd = ovulationDay;

    // Find if user has logged data
    let lastStartStr = null;
    if (stats.startDates.length > 0) {
        for (let i = stats.startDates.length - 1; i >= 0; i--) {
            const startDateStr = stats.startDates[i];
            if (startDateStr <= todayStr) {
                lastStartStr = startDateStr;
                break;
            }
        }
    }

    let cycleDay = null;
    let currentStatus = "neutral"; // "menstrual", "fertile", "ovulation", "neutral"
    if (lastStartStr) {
        const diffDays = getDaysDifference(lastStartStr, todayStr);
        cycleDay = diffDays + 1;

        if (cycleDay <= L_period) {
            currentStatus = "menstrual";
        } else if (cycleDay === ovulationDay) {
            currentStatus = "ovulation";
        } else if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
            currentStatus = "fertile";
        } else {
            currentStatus = "neutral";
        }
    }

    // Helper for polar to cartesian arc path
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function describeArc(x, y, radius, startAngle, endAngle) {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return [
            "M", start.x, start.y, 
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");       
    }

    // Draw Menstruación segment
    const mStartAngle = 0;
    const mEndAngle = L_period * (360 / L_cycle);
    const mDurationDeg = mEndAngle - mStartAngle;
    const mCap = Math.min(4, mDurationDeg / 2.5);
    
    if (mEndAngle - mCap > mStartAngle + mCap) {
        const pathD = describeArc(100, 100, 85, mStartAngle + mCap, mEndAngle - mCap);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathD);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "var(--primary)");
        path.setAttribute("stroke-width", "10");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("class", "wheel-segment segment-menstrual");
        svg.appendChild(path);
    }

    // Draw Ventana Fértil segment (Days: fertileStart to fertileEnd)
    const fStartAngle = (fertileStart - 1) * (360 / L_cycle);
    const fEndAngle = fertileEnd * (360 / L_cycle);
    const fDurationDeg = fEndAngle - fStartAngle;
    const fCap = Math.min(4, fDurationDeg / 2.5);

    if (fEndAngle - fCap > fStartAngle + fCap) {
        const pathD = describeArc(100, 100, 85, fStartAngle + fCap, fEndAngle - fCap);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathD);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#B185DB");
        path.setAttribute("stroke-width", "10");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("class", "wheel-segment segment-fertile");
        svg.appendChild(path);
    }

    // Draw Ovulation Day marker (Día más fértil)
    const ovAngle = (ovulationDay - 0.5) * (360 / L_cycle);
    const ovAngleRad = (ovAngle - 90) * Math.PI / 180;
    const ovX = 100 + 85 * Math.cos(ovAngleRad);
    const ovY = 100 + 85 * Math.sin(ovAngleRad);

    const ovStar = document.createElementNS("http://www.w3.org/2000/svg", "g");
    ovStar.setAttribute("class", "wheel-ovulation-marker");
    ovStar.innerHTML = `
        <circle cx="${ovX}" cy="${ovY}" r="9" fill="#8E44AD" opacity="0.25" class="ovulation-glow"></circle>
        <path d="M ${ovX} ${ovY-7} L ${ovX+2} ${ovY-2} L ${ovX+7} ${ovY} L ${ovX+2} ${ovY+2} L ${ovX} ${ovY+7} L ${ovX-2} ${ovY+2} L ${ovX-7} ${ovY} L ${ovX-2} ${ovY-2} Z" fill="#8E44AD" stroke="white" stroke-width="1.2"></path>
    `;
    svg.appendChild(ovStar);

    // Draw marker if cycleDay is active
    if (cycleDay !== null) {
        const displayDay = cycleDay;
        const cappedDay = Math.min(cycleDay, L_cycle);
        
        // Calculate marker angle (middle of the day block)
        const markerAngle = (cappedDay - 0.5) * (360 / L_cycle);
        const markerAngleRad = (markerAngle - 90) * Math.PI / 180;
        const markerX = 100 + 85 * Math.cos(markerAngleRad);
        const markerY = 100 + 85 * Math.sin(markerAngleRad);

        // Marker color based on currentStatus
        let markerColor = "var(--secondary)";
        if (currentStatus === "menstrual") {
            markerColor = "var(--primary)";
        } else if (currentStatus === "ovulation") {
            markerColor = "#8E44AD";
        } else if (currentStatus === "fertile") {
            markerColor = "#B185DB";
        }

        // Draw glowing aura / pulse circle first
        const markerPulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        markerPulse.setAttribute("cx", markerX.toString());
        markerPulse.setAttribute("cy", markerY.toString());
        markerPulse.setAttribute("r", "13");
        markerPulse.setAttribute("fill", markerColor);
        markerPulse.setAttribute("opacity", "0.25");
        markerPulse.setAttribute("class", "wheel-marker-pulse");
        svg.appendChild(markerPulse);

        // Draw marker circle
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        marker.setAttribute("cx", markerX.toString());
        marker.setAttribute("cy", markerY.toString());
        marker.setAttribute("r", "7");
        marker.setAttribute("fill", "white");
        marker.setAttribute("stroke", markerColor);
        marker.setAttribute("stroke-width", "3");
        marker.setAttribute("filter", "url(#marker-shadow)");
        marker.setAttribute("class", "wheel-marker");
        svg.appendChild(marker);

        // Center text update
        dayTotalText.style.color = markerColor;

        // Calculate dynamic subtext based on status
        let subtext = "";
        if (currentStatus === "menstrual") {
            const daysLeft = L_period - displayDay + 1;
            const verb = daysLeft === 1 ? "Queda" : "Quedan";
            subtext = daysLeft > 0 
                ? `${verb} ${daysLeft} día${daysLeft === 1 ? '' : 's'} de regla`
                : "Último día de regla";
        } else if (displayDay <= ovulationDay) {
            const daysLeft = ovulationDay - displayDay;
            if (daysLeft === 0) {
                subtext = "¡Hoy es tu día más fértil! ✨";
            } else {
                const verb = daysLeft === 1 ? "Queda" : "Quedan";
                subtext = `${verb} ${daysLeft} día${daysLeft === 1 ? '' : 's'} para tu día más fértil`;
            }
        } else {
            // Ovulation day has passed
            const daysLeft = L_cycle - displayDay + 1;
            if (daysLeft <= 0) {
                subtext = "Regla inminente / retrasada";
            } else {
                const verb = daysLeft === 1 ? "Queda" : "Quedan";
                subtext = `${verb} ${daysLeft} día${daysLeft === 1 ? '' : 's'} para la siguiente regla`;
            }
        }
        dayTotalText.textContent = subtext;
    } else {
        // Fallback text if no data logged
        dayTotalText.textContent = "Sin datos";
        dayTotalText.style.color = "var(--text-muted)";
    }

    // Build Legend for Fertilidad
    legendContainer.innerHTML = "";
    
    const legendItems = [
        { key: 'menstrual', name: 'Menstruación', emoji: '🩸', desc: `${L_period} días (Días 1-${L_period})`, color: 'var(--primary)' },
        { key: 'fertile', name: 'Ventana Fértil', emoji: '💜', desc: `6 días (Días ${fertileStart}-${fertileEnd})`, color: '#B185DB' },
        { key: 'ovulation', name: 'Día Más Fértil', emoji: '✨', desc: `Día ${ovulationDay} (Ovulación)`, color: '#8E44AD' },
        { key: 'neutral', name: 'Baja Fertilidad', emoji: '⚪', desc: 'Resto del ciclo', color: '#B0BEC5' }
    ];

    legendItems.forEach(item => {
        const isCurrent = currentStatus === item.key;
        const legendItem = document.createElement("div");
        legendItem.className = `legend-item ${isCurrent ? 'active-phase-' + item.key : ''}`;
        
        legendItem.innerHTML = `
            <div class="legend-info">
                <span class="legend-dot" style="background-color: ${item.color};"></span>
                <span class="legend-name">${item.emoji} ${item.name}</span>
            </div>
            <span class="legend-days">${item.desc}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

// --- Predicciones de Bienestar ---
function getSymptomPredictions(stats) {
    const todayStr = "2026-06-30"; // App context today
    const L_cycle = stats.avgCycleLength || 29;
    const L_period = stats.avgPeriodLength || 5;
    const ovulationDay = L_cycle - 14;

    // Find last start date
    let lastStartStr = null;
    if (stats.startDates.length > 0) {
        for (let i = stats.startDates.length - 1; i >= 0; i--) {
            const startDateStr = stats.startDates[i];
            if (startDateStr <= todayStr) {
                lastStartStr = startDateStr;
                break;
            }
        }
    }

    if (!lastStartStr) return [];

    const diffDays = getDaysDifference(lastStartStr, todayStr);
    const cycleDay = diffDays + 1; // Today's cycle day
    const daysBeforePeriod = L_cycle - cycleDay + 1; // Days remaining in cycle

    // Gather all historical cycles
    const historicalCycles = [];
    for (let i = 0; i < stats.startDates.length; i++) {
        const start = stats.startDates[i];
        let nextStart = null;
        if (i < stats.startDates.length - 1) {
            nextStart = stats.startDates[i + 1];
        } else if (stats.nextPeriodEstDate) {
            nextStart = formatDateKey(stats.nextPeriodEstDate);
        }
        
        if (nextStart) {
            historicalCycles.push({
                start: start,
                nextStart: nextStart,
                length: getDaysDifference(start, nextStart)
            });
        }
    }

    // Check up to the last 6 historical cycles
    const recentCycles = historicalCycles.slice(-6);
    if (recentCycles.length === 0) return [];

    // Analyze symptoms
    const symptomsToAnalyze = ['headache', 'bloating', 'mood', 'cramps', 'nipples'];
    const predictions = [];

    symptomsToAnalyze.forEach(symptomKey => {
        let matchCount = 0;
        
        recentCycles.forEach(cycle => {
            const targetDateForward = getAdjacentDateStr(cycle.start, cycleDay - 1);
            const targetDateBackward = getAdjacentDateStr(cycle.nextStart, -daysBeforePeriod);

            // We check matching day and its adjacent days (±1 day) for robustness
            const datesToCheck = new Set([
                targetDateForward,
                getAdjacentDateStr(targetDateForward, -1),
                getAdjacentDateStr(targetDateForward, 1),
                targetDateBackward,
                getAdjacentDateStr(targetDateBackward, -1),
                getAdjacentDateStr(targetDateBackward, 1)
            ]);

            let hasSymptom = false;
            datesToCheck.forEach(dateStr => {
                if (dateStr >= cycle.start && dateStr < cycle.nextStart) {
                    const record = records[dateStr];
                    if (record && record.symptoms && record.symptoms.includes(symptomKey)) {
                        hasSymptom = true;
                    }
                }
            });

            if (hasSymptom) {
                matchCount++;
            }
        });

        // Threshold logic: 3 matches out of 5-6 cycles, or 2 matches for <= 4 cycles
        let threshold = 3;
        if (recentCycles.length <= 4) {
            threshold = 2;
        }
        
        if (matchCount >= threshold) {
            predictions.push({
                type: 'symptom',
                key: symptomKey,
                name: symptomEmojis[symptomKey] || symptomKey,
                emoji: symptomEmojis[symptomKey] ? symptomEmojis[symptomKey].split(" ")[0] : "⚠️",
                cleanName: symptomEmojis[symptomKey] ? symptomEmojis[symptomKey].substring(symptomEmojis[symptomKey].indexOf(" ") + 1) : symptomKey,
                count: matchCount,
                total: recentCycles.length
            });
        }
    });

    // Also check Menstrual Pain (dolor menstrual, painLevel >= 2)
    let painMatchCount = 0;
    recentCycles.forEach(cycle => {
        const targetDateForward = getAdjacentDateStr(cycle.start, cycleDay - 1);
        const targetDateBackward = getAdjacentDateStr(cycle.nextStart, -daysBeforePeriod);
        
        const datesToCheck = new Set([
            targetDateForward,
            getAdjacentDateStr(targetDateForward, -1),
            getAdjacentDateStr(targetDateForward, 1),
            targetDateBackward,
            getAdjacentDateStr(targetDateBackward, -1),
            getAdjacentDateStr(targetDateBackward, 1)
        ]);

        let hasPain = false;
        datesToCheck.forEach(dateStr => {
            if (dateStr >= cycle.start && dateStr < cycle.nextStart) {
                const record = records[dateStr];
                if (record && record.painLevel >= 2) {
                    hasPain = true;
                }
            }
        });

        if (hasPain) {
            painMatchCount++;
        }
    });

    let painThreshold = 3;
    if (recentCycles.length <= 4) {
        painThreshold = 2;
    }

    if (painMatchCount >= painThreshold) {
        predictions.push({
            type: 'pain',
            key: 'pain',
            name: 'Dolor menstrual',
            emoji: '⚡',
            cleanName: 'Molestias / Dolor menstrual',
            count: painMatchCount,
            total: recentCycles.length
        });
    }

    return predictions;
}

function updateSymptomPredictions(stats) {
    const box = document.getElementById("hoy-predictions-box");
    const list = document.getElementById("predictions-list");
    
    if (!box || !list) return;

    const predictions = getSymptomPredictions(stats);

    if (predictions.length === 0) {
        box.classList.add("hidden");
        list.innerHTML = "";
        return;
    }

    box.classList.remove("hidden");
    list.innerHTML = "";

    predictions.forEach(pred => {
        const li = document.createElement("li");
        li.className = "prediction-item";
        
        let descHtml = "";
        if (pred.type === 'pain') {
            descHtml = `Es probable que hoy experimentes <span class="prediction-desc-highlight">${pred.cleanName}</span>.`;
        } else {
            descHtml = `Es probable que hoy sientas <span class="prediction-desc-highlight">${pred.cleanName}</span>.`;
        }

        li.innerHTML = `
            <span class="prediction-emoji">${pred.emoji}</span>
            <div class="prediction-text">
                <p>${descHtml}</p>
                <span class="prediction-item-badge">Patrón detectado en ${pred.count} de tus últimos ${pred.total} ciclos</span>
            </div>
        `;
        list.appendChild(li);
    });
}
