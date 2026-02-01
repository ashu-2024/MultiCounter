// App State
const state = {
    counters: {},
    counterOrder: [],
    history: {}
};

// DOM Elements
const countersGrid = document.getElementById('countersGrid');
const nameInput = document.getElementById('nameInput');
const addBtn = document.getElementById('addBtn');
const historyList = document.getElementById('historyList');
const dateFilter = document.getElementById('dateFilter');
const counterFilter = document.getElementById('counterFilter');

// Initialize
function init() {
    loadData();
    checkNewDay();
    renderAll();
    
    addBtn.addEventListener('click', addCounter);
    nameInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') addCounter();
    });
    
    dateFilter.addEventListener('change', renderHistory);
    counterFilter.addEventListener('change', renderHistory);
    
    setInterval(saveData, 60000);
}

// Add New Counter
function addCounter() {
    const name = nameInput.value.trim();
    if (!name) return;
    
    const id = Date.now().toString();
    const today = new Date().toDateString();
    
    state.counters[id] = {
        id, name,
        count: 0,
        timestamps: [],
        date: today,
        allTimeHigh: 0,
        yesterday: 0
    };
    
    state.counterOrder.push(id);
    
    nameInput.value = '';
    saveData();
    renderAll();
}

// Increment Counter
function increment(id) {
    const counter = state.counters[id];
    counter.count++;
    if (counter.count > counter.allTimeHigh) {
        counter.allTimeHigh = counter.count;
    }
    counter.timestamps.unshift(new Date().toLocaleTimeString());
    counter.date = new Date().toDateString();
    saveData();
    updateCounterDisplay(id);
}

// Decrement Counter
function decrement(id) {
    const counter = state.counters[id];
    if (counter.count > 0) {
        counter.count--;
        counter.date = new Date().toDateString();
        saveData();
        updateCounterDisplay(id);
    }
}

// Reset Counter
function resetCounter(id) {
    const counter = state.counters[id];
    if (counter.count > 0 || counter.timestamps.length > 0) {
        if (confirm(`Reset today's count for "${counter.name}"?`)) {
            saveToHistory(id);
            counter.count = 0;
            counter.timestamps = [];
            counter.date = new Date().toDateString();
            saveData();
            updateCounterDisplay(id);
        }
    }
}

// Delete Counter
function deleteCounter(id) {
    const counterName = state.counters[id].name;
    if (confirm(`Delete "${counterName}"?`)) {
        delete state.counters[id];
        state.counterOrder = state.counterOrder.filter(counterId => counterId !== id);
        saveData();
        renderAll();
    }
}

// Check for New Day
function checkNewDay() {
    const today = new Date().toDateString();
    let needsUpdate = false;
    
    Object.values(state.counters).forEach(counter => {
        if (counter.date !== today) {
            counter.yesterday = counter.count;
            saveToHistory(counter.id);
            counter.count = 0;
            counter.timestamps = [];
            counter.date = today;
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        saveData();
        renderAll();
    }
}

// Save to History
function saveToHistory(id) {
    const counter = state.counters[id];
    if (counter.count > 0) {
        const date = counter.date;
        if (!state.history[date]) state.history[date] = {};
        state.history[date][id] = {
            name: counter.name,
            count: counter.count,
            timestamps: [...counter.timestamps]
        };
        saveData();
    }
}

// Save/Load Data
function saveData() {
    localStorage.setItem('counters', JSON.stringify(state.counters));
    localStorage.setItem('counterOrder', JSON.stringify(state.counterOrder));
    localStorage.setItem('history', JSON.stringify(state.history));
}

function loadData() {
    const savedCounters = localStorage.getItem('counters');
    const savedOrder = localStorage.getItem('counterOrder');
    const savedHistory = localStorage.getItem('history');
    
    if (savedCounters) state.counters = JSON.parse(savedCounters);
    if (savedOrder) state.counterOrder = JSON.parse(savedOrder);
    if (savedHistory) state.history = JSON.parse(savedHistory);
    
    if (!state.counterOrder || state.counterOrder.length === 0) {
        state.counterOrder = Object.keys(state.counters);
    }
}

// Render Functions
function renderAll() {
    renderCounters();
    renderHistory();
    updateFilters();
}

function renderCounters() {
    const counters = state.counterOrder
        .map(id => state.counters[id])
        .filter(counter => counter);
    
    if (counters.length === 0) {
        countersGrid.innerHTML = '<div class="empty">No counters yet. Add one above!</div>';
        return;
    }
    
    countersGrid.innerHTML = counters.map(counter => `
        <div class="counter-card" data-id="${counter.id}">
            <div class="counter-header">
                <div class="counter-name">${counter.name}</div>
                <button class="delete-btn" onclick="deleteCounter('${counter.id}')">×</button>
            </div>
            <div class="count-display" data-value="${counter.id}">${counter.count}</div>
            <div class="controls">
                <button class="minus-btn" onclick="decrement('${counter.id}')">−</button>
                <button class="plus-btn" onclick="increment('${counter.id}')">+</button>
            </div>
            <button class="reset-btn" onclick="resetCounter('${counter.id}')">Reset Today</button>
            ${counter.timestamps.length > 0 ? `
                <div class="timestamps" id="timestamps-${counter.id}">
                    <div style="font-weight: bold; margin-bottom: 5px;">Recent increments:</div>
                    ${counter.timestamps.slice(0, 3).map(t => `<div><span>${t}</span></div>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function updateCounterDisplay(id) {
    const counter = state.counters[id];
    if (!counter) return;
    
    const countElement = document.querySelector(`[data-value="${id}"]`);
    if (countElement) {
        countElement.textContent = counter.count;
    }
    
    const timestampsContainer = document.getElementById(`timestamps-${id}`);
    const counterCard = document.querySelector(`[data-id="${id}"]`);
    
    if (timestampsContainer) {
        timestampsContainer.remove();
    }
    
    if (counter.timestamps.length > 0 && counterCard) {
        const timestamps = document.createElement('div');
        timestamps.className = 'timestamps';
        timestamps.id = `timestamps-${id}`;
        timestamps.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Recent increments:</div>
            ${counter.timestamps.slice(0, 3).map(t => `<div><span>${t}</span></div>`).join('')}
        `;
        
        const resetBtn = counterCard.querySelector('.reset-btn');
        if (resetBtn) {
            resetBtn.insertAdjacentElement('afterend', timestamps);
        }
    }
}

function renderHistory() {
    const date = dateFilter.value;
    const counterId = counterFilter.value;
    const historyEntries = Object.entries(state.history);
    
    if (historyEntries.length === 0) {
        historyList.innerHTML = '<div class="empty">No history yet</div>';
        return;
    }
    
    let filteredHistory = historyEntries;
    
    if (date !== 'all') {
        filteredHistory = filteredHistory.filter(([d]) => d === date);
    }
    
    filteredHistory.sort((a, b) => new Date(b[0]) - new Date(a[0]));
    
    historyList.innerHTML = filteredHistory.map(([dateStr, counters]) => {
        let dayCounters = Object.values(counters);
        
        if (counterId !== 'all') {
            dayCounters = dayCounters.filter(c => {
                return c.name === state.counters[counterId]?.name;
            });
        }
        
        if (dayCounters.length === 0) return '';
        
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; color: #E4004B; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #FAD691;">
                    ${formattedDate}
                </div>
                ${dayCounters.map(counter => `
                    <div class="history-item">
                        <span style="font-weight: 600;">${counter.name}</span>
                        <span style="font-weight: 700; color: #E4004B;">${counter.count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    if (historyList.innerHTML === '') {
        historyList.innerHTML = '<div class="empty">No matching history</div>';
    }
}

function updateFilters() {
    const dates = [...new Set(Object.keys(state.history))];
    dates.sort((a, b) => new Date(b) - new Date(a));
    
    dateFilter.innerHTML = '<option value="all">All Dates</option>' + 
        dates.map(date => {
            const d = new Date(date);
            return `<option value="${date}">${d.toLocaleDateString()}</option>`;
        }).join('');
    
    const counters = state.counterOrder
        .map(id => state.counters[id])
        .filter(counter => counter);
    
    counterFilter.innerHTML = '<option value="all">All Counters</option>' + 
        counters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// Initialize
window.addEventListener('DOMContentLoaded', init);

// Global functions for onclick handlers
window.increment = increment;
window.decrement = decrement;
window.resetCounter = resetCounter;
window.deleteCounter = deleteCounter;