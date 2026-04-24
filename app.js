/**
 * USA 2026 Holiday Budget Tracker 
 * Version 5.3.0 Engine (OS Theme Integration)
 */

const API_URL = "https://open.er-api.com/v6/latest/GBP";
let exchangeRate = 1.35; 
let currentTab = localStorage.getItem('activeTab_v5.3') || localStorage.getItem('activeTab_v5.2') || 'Home';
let bankrollGbp = localStorage.getItem('bankrollGbp') || 5000;
let isDarkMode = false; // Overwritten by OS/storage logic below
let editingIndex = null;
let editingFuelLoc = null;

// --- 1. NEW THEME ENGINE ---
function applyThemeMode(isDark) {
    // Toggle the 'dark' class for Tailwind styling
    document.body.classList.toggle('dark', isDark);
    isDarkMode = isDark;
    
    // Update the UI Segmented Buttons
    const btnLight = document.getElementById('btnLight');
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { 
            btnLight.classList.remove('active'); 
            btnDark.classList.add('active'); 
        } else { 
            btnLight.classList.add('active'); 
            btnDark.classList.remove('active'); 
        }
    }

    // Update the Mobile OS Status Bar Color
    const meta = document.getElementById('theme-meta');
    if (meta) {
        // Match our slate-100 (light) and slate-950 (dark) base backgrounds
        meta.content = isDark ? '#020617' : '#f1f5f9';
    }
}

function setThemeMode(isDark) {
    triggerHaptic('light');
    applyThemeMode(isDark);
    localStorage.setItem('USA26_Theme', isDark); 
}

// --- HAPTIC FEEDBACK ENGINE ---
function triggerHaptic(type = 'light') {
    if (!navigator.vibrate) return;
    if (type === 'light') navigator.vibrate(30);
    if (type === 'heavy') navigator.vibrate([40, 30, 40]);
    if (type === 'success') navigator.vibrate([30, 50, 30, 50, 40]);
    if (type === 'error') navigator.vibrate([60, 40, 60]);
}

// --- SCROLL LOCK LOGIC ---
let scrollPosition = 0;
function lockScroll() {
    scrollPosition = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
}
function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollPosition);
}

const defaultData = [
    { day: "Mon 20-Jul", loc: "LA", activity: "Pizza", cat: "🍔 Food", usd: 50, spent: 0 },
    { day: "Tue 21-Jul", loc: "LA", activity: "Disneyland", cat: "🎢 Fun", usd: 500, spent: 0 },
    { day: "Wed 22-Jul", loc: "LA", activity: "San Diego", cat: "🛍️ Mixed", usd: 400, spent: 0 },
    { day: "Thu 23-Jul", loc: "LA", activity: "LA: Lunch/Dinner", cat: "🍔 Food", usd: 400, spent: 0 },
    { day: "Fri 24-Jul", loc: "Utah", activity: "Travel to Utah", cat: "🚕 Transport", usd: 500, spent: 0 },
    { day: "Sat 25-Jul", loc: "Utah", activity: "Utah: Dinner", cat: "🍔 Food", usd: 250, spent: 0 },
    { day: "Sun 26-Jul", loc: "Utah", activity: "Utah: Dinner", cat: "🍔 Food", usd: 250, spent: 0 },
    { day: "Mon 27-Jul", loc: "Utah", activity: "Utah: Dinner", cat: "🍔 Food", usd: 250, spent: 0 },
    { day: "Tue 28-Jul", loc: "Utah", activity: "Utah: Lunch/Dinner", cat: "🍔 Food", usd: 300, spent: 0 },
    { day: "Wed 29-Jul", loc: "Utah", activity: "Utah (SLC)", cat: "🛍️ Mixed", usd: 500, spent: 0 },
    { day: "Thu 30-Jul", loc: "Utah", activity: "Utah: Lunch/Dinner", cat: "🍔 Food", usd: 300, spent: 0 },
    { day: "Fri 31-Jul", loc: "Utah", activity: "Utah: Dinner", cat: "🍔 Food", usd: 250, spent: 0 },
    { day: "Sat 01-Aug", loc: "Vegas", activity: "Travel to Vegas", cat: "🚕 Transport", usd: 500, spent: 0 },
    { day: "Sun 02-Aug", loc: "Vegas", activity: "Vegas Shopping", cat: "🛍️ Mixed", usd: 1000, spent: 0 },
    { day: "Mon 03-Aug", loc: "Vegas", activity: "Vegas L/D", cat: "🍔 Food", usd: 300, spent: 0 },
    { day: "Tue 04-Aug", loc: "Vegas", activity: "Vegas Dinner", cat: "🍔 Food", usd: 200, spent: 0 },
    { day: "Wed 05-Aug", loc: "Vegas", activity: "Vegas L/D", cat: "🍔 Food", usd: 500, spent: 0 },
    { day: "Thu 06-Aug", loc: "Vegas", activity: "Vegas L/D", cat: "🍔 Food", usd: 200, spent: 0 },
    { day: "Fri 07-Aug", loc: "Home", activity: "Flight Home", cat: "🚕 Transport", usd: 0, spent: 0 }
];

let tripData = JSON.parse(localStorage.getItem('holidayBudget_v5.3')) || 
               JSON.parse(localStorage.getItem('holidayBudget_v5.2')) || 
               JSON.parse(JSON.stringify(defaultData));
tripData = tripData.map(item => ({...item, cat: item.cat || "🛍️ Mixed"}));

let fuelEntries = JSON.parse(localStorage.getItem('holidayFuel_v5.3')) || 
                  JSON.parse(localStorage.getItem('holidayFuel_v5.2')) || [];

async function init() {
    // OS Theme Fallback Boot Sequence
    const savedTheme = localStorage.getItem('USA26_Theme');
    const oldVegas = localStorage.getItem('vegasMode'); // check old toggle status
    const prefersDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialDark = prefersDarkOS;
    if (savedTheme !== null) initialDark = savedTheme === 'true';
    else if (oldVegas !== null) initialDark = oldVegas === 'true';

    applyThemeMode(initialDark);
    
    // Bind the new UI buttons
    document.getElementById('btnLight')?.addEventListener('click', () => setThemeMode(false));
    document.getElementById('btnDark')?.addEventListener('click', () => setThemeMode(true));

    await fetchRates();
    document.getElementById('input-gbp-limit').value = bankrollGbp;
    switchTab(currentTab, false);
}

async function fetchRates() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        exchangeRate = data.rates.USD;
        document.getElementById('usd-rate').innerText = exchangeRate.toFixed(2);
    } catch (e) { console.warn("API Offline"); }
}

function animateValue(objId, end, duration = 800) {
    const obj = document.getElementById(objId);
    if(!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(easeOut * end);
        obj.innerText = `$${currentVal}`;
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerText = `$${end}`;
    };
    window.requestAnimationFrame(step);
}

function switchTab(tabName, withHaptic = true) {
    if(withHaptic) triggerHaptic('light');
    currentTab = tabName;
    localStorage.setItem('activeTab_v5.3', tabName);
    
    const header = document.getElementById('main-header');
    header.className = `sticky top-0 z-30 transition-all duration-500 theme-${tabName.toLowerCase()} shadow-md`;
    
    // Ambient Background Base Update
    document.body.className = `text-slate-900 no-scrollbar transition-all duration-700 ease-in-out ambient-${tabName.toLowerCase()}`;
    applyThemeMode(isDarkMode); // reapply the dark mode class explicitly over the base string
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if(document.getElementById(`nav-${tabName}`)) document.getElementById(`nav-${tabName}`).classList.add('active');
    
    document.getElementById('view-title').innerText = (tabName === 'Home' ? 'Master Budget' : tabName + ' Budget');
    
    const views = ['dashboard-view', 'tab-content-container', 'admin-panel'];
    views.forEach(v => document.getElementById(v).classList.add('hidden'));

    if(tabName === 'Admin') {
        document.getElementById('header-stats').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
    } else {
        document.getElementById('header-stats').classList.remove('hidden');
        if(tabName === 'Home') {
            document.getElementById('dashboard-view').classList.remove('hidden');
            updateDashboard();
        } else {
            document.getElementById('tab-content-container').classList.remove('hidden');
            renderGrid(tabName);
        }
        updateHeaderStats(tabName); 
    }
}

function updateHeaderStats(tabName) {
    let plannedUsd = 0, spentUsd = 0, leftUsd = 0;
    
    if (tabName === 'Home') {
        spentUsd = tripData.reduce((s, i) => s + parseFloat(i.spent || 0), 0);
        plannedUsd = bankrollGbp * exchangeRate;
        leftUsd = plannedUsd - spentUsd;
    } else {
        const locData = tripData.filter(d => d.loc === tabName);
        plannedUsd = locData.reduce((s, i) => s + (parseFloat(i.usd) || 0), 0);
        spentUsd = locData.reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);
        leftUsd = plannedUsd - spentUsd;
    }

    animateValue('stat-goal-usd', Math.round(plannedUsd));
    animateValue('stat-spent-usd', Math.round(spentUsd));
    animateValue('stat-remain-usd', Math.round(leftUsd));
    
    document.getElementById('stat-goal-gbp').innerText = `£${Math.round(plannedUsd / exchangeRate)}`;
    document.getElementById('stat-spent-gbp').innerText = `£${Math.round(spentUsd / exchangeRate)}`;
    document.getElementById('stat-remain-gbp').innerText = `£${Math.round(leftUsd / exchangeRate)}`;
    
    const pill = document.getElementById('remain-pill');
    if (leftUsd < 0) pill.className = "header-stat-pill bg-rose-500/90 border-rose-400 transition-colors duration-500";
    else pill.className = "header-stat-pill bg-white/30 border-white/50 transition-colors duration-500";
}

function updateDashboard() {
    const totalActualUsd = tripData.reduce((s, i) => s + parseFloat(i.spent || 0), 0);
    const limitUsd = bankrollGbp * exchangeRate;
    const burnPercent = limitUsd > 0 ? (totalActualUsd / limitUsd) * 100 : 0;
    const cappedPercent = Math.min(burnPercent, 100);

    document.getElementById('burn-percent').innerText = `${Math.round(burnPercent)}%`;
    document.getElementById('burn-progress').style.width = `${cappedPercent}%`;
    
    setTimeout(() => {
        document.getElementById('burn-car').style.left = `${cappedPercent}%`;
    }, 100);

    const totalGlobalFuel = fuelEntries.reduce((s, e) => s + e.usd, 0);
    animateValue('fuel-usd', Math.round(totalGlobalFuel));
    document.getElementById('fuel-gbp').innerText = `£${Math.round(totalGlobalFuel / exchangeRate)}`;

    const locs = { 'LA': '🌴', 'Utah': '🏔️', 'Vegas': '🎰' };
    const regionalContainer = document.getElementById('regional-stats');
    regionalContainer.innerHTML = Object.entries(locs).map(([loc, icon], index) => {
        const data = tripData.filter(d => d.loc === loc);
        const plannedUsd = data.reduce((s, i) => s + i.usd, 0);
        const actualUsd = data.reduce((s, i) => s + i.spent, 0);
        const diffUsd = plannedUsd - actualUsd;
        
        const plannedGbp = (plannedUsd / exchangeRate).toFixed(0);
        const actualGbp = (actualUsd / exchangeRate).toFixed(0);
        const diffGbp = (diffUsd / exchangeRate).toFixed(0);

        const statusBorder = actualUsd === 0 && plannedUsd === 0 ? 'border-surface-alt' : (diffUsd >= 0 ? 'border-green-400 dark:border-green-600' : 'border-rose-500 dark:border-rose-600');
        const diffEmoji = actualUsd > 0 ? (diffUsd >= 0 ? '🥳' : '😬') : '';

        return `
        <div class="animate-ticket surface-card p-5 rounded-[30px] border-l-8 ${statusBorder} shadow-lg shadow-slate-200/40 dark:shadow-none transition-colors border border-surface glass-panel" style="animation-delay: ${index * 0.15}s;">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-xl drop-shadow-md">${icon}</span>
                    <p class="text-[11px] font-black uppercase tracking-widest text-mute">${loc}</p>
                </div>
                <div class="text-right">
                     <p class="text-[8px] font-black text-mute uppercase mb-0.5">Balance ${diffEmoji}</p>
                     <p class="text-sm font-black ${diffUsd >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}">$${diffUsd} <span class="text-[10px] opacity-40">/ £${diffGbp}</span></p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 border-t border-surface pt-3">
                <div>
                    <p class="text-[8px] font-black text-mute uppercase">Plan</p>
                    <p class="text-xs font-bold text-primary">$${plannedUsd} <span class="text-[9px] text-mute">/ £${plannedGbp}</span></p>
                </div>
                <div class="text-right">
                    <p class="text-[8px] font-black text-mute uppercase">Spent</p>
                    <p class="text-xs font-black text-primary">$${actualUsd} <span class="text-[9px] text-mute">/ £${actualGbp}</span></p>
                </div>
            </div>
        </div>`;
    }).join('');
}

let touchStartX = 0;
let touchEndX = 0;
function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
function handleTouchEnd(e, index) {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 60) {
        triggerHaptic('light');
        openEdit(index); 
    }
}

function renderGrid(filter) {
    const fuelContainer = document.getElementById('location-fuel-container');
    const grid = document.getElementById('tab-content');
    
    const locFuelTotal = fuelEntries.filter(e => e.loc === filter).reduce((s, e) => s + e.usd, 0);

    fuelContainer.innerHTML = `
        <div class="p-5 rounded-[32px] border-2 border-slate-700 shadow-xl flex justify-between items-center bg-slate-800 dark:bg-slate-900 transition-colors mb-6 cursor-pointer active:scale-95 hover:bg-slate-700" onclick="openFuelEdit('${filter}')">
            <div class="flex items-center gap-3">
                <div class="bg-slate-700 p-3 rounded-2xl text-2xl shadow-inner border border-slate-600">⛽</div>
                <div>
                    <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Hire Car Fuel</p>
                    <p class="text-sm font-bold text-white">Log & Add</p>
                </div>
            </div>
            <div class="text-right flex items-center gap-4">
                <div>
                    <p class="text-2xl font-black text-white leading-none">$${locFuelTotal}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase mt-1">£${(locFuelTotal/exchangeRate).toFixed(0)}</p>
                </div>
                <div class="bg-indigo-500 shadow-lg shadow-indigo-500/30 text-white p-2 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
            </div>
        </div>
    `;

    const data = tripData.filter(d => d.loc === filter);
    grid.innerHTML = data.map((item, loopIndex) => {
        const globalIndex = tripData.findIndex(d => d.day === item.day);
        let dayName = "Day", dayNum = "00", month = "MTH";
        if(item.day.includes(' ')) {
            const parts = item.day.split(' ');
            dayName = parts[0];
            if(parts[1] && parts[1].includes('-')) {
                const dParts = parts[1].split('-');
                dayNum = dParts[0];
                month = dParts[1];
            } else { dayNum = parts[1]; }
        }

        return `
        <div class="ticket-card surface-card animate-ticket" style="animation-delay: ${(loopIndex * 0.1) + 0.1}s;" ontouchstart="handleTouchStart(event)" ontouchend="handleTouchEnd(event, ${globalIndex})">
            <div class="absolute inset-y-0 right-0 bg-indigo-500 w-16 rounded-r-[32px] flex items-center justify-center -z-10 opacity-0 transition-opacity">
                <span class="text-white text-xs font-bold -rotate-90 tracking-widest">SWIPE</span>
            </div>
            
            <div class="ticket-content bg-surface rounded-[32px] transition-transform flex flex-col shadow-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden glass-panel">
                <div class="p-5 flex gap-4 items-center relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <div class="flex-shrink-0 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-2xl p-2 w-14 text-center shadow-md shadow-indigo-500/30 text-white border border-indigo-400/30">
                        <p class="text-[8px] font-black uppercase opacity-90">${month}</p>
                        <p class="text-2xl font-black leading-none my-0.5 tracking-tighter drop-shadow-md">${dayNum}</p>
                        <p class="text-[8px] font-black uppercase opacity-90">${dayName}</p>
                    </div>
                    
                    <div class="flex-grow">
                        <div class="flex justify-between items-start mb-1.5">
                            <span class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-md text-[8px] font-black tracking-widest uppercase shadow-sm">${item.cat}</span>
                            <button onclick="triggerHaptic(); openEdit(${globalIndex})" class="text-slate-300 dark:text-slate-500 hover:text-indigo-500 active:scale-90 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6 drop-shadow-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.68-10.68z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 7.125L16.862 4.487" /></svg>
                            </button>
                        </div>
                        <p class="text-sm font-black text-primary leading-tight line-clamp-2 mt-1">"${item.activity}"</p>
                    </div>
                </div>

                <div class="relative flex items-center bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-sm">
                    <div class="h-6 w-3 bg-slate-100 dark:bg-[#020617] rounded-r-full border-y-2 border-r-2 border-slate-200 dark:border-slate-700 -ml-[2px] transition-colors duration-700 theme-hole"></div>
                    <div class="flex-grow border-t-2 border-dashed border-indigo-200 dark:border-indigo-800 mx-2"></div>
                    <div class="h-6 w-3 bg-slate-100 dark:bg-[#020617] rounded-l-full border-y-2 border-l-2 border-slate-200 dark:border-slate-700 -mr-[2px] transition-colors duration-700 theme-hole"></div>
                </div>

                <div class="p-5 pt-3 pb-6 bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-sm grid grid-cols-2 gap-4 items-center">
                    <div>
                        <span class="inline-block bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded text-[8px] font-black uppercase mb-1 border border-indigo-300/40 shadow-sm">Goal Plan</span>
                        <p class="text-xl font-black text-indigo-900 dark:text-indigo-100">$${item.usd}</p>
                    </div>
                    <div class="text-right border-l-2 border-indigo-200/60 dark:border-indigo-800 pl-4">
                        <span class="inline-block bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded text-[8px] font-black uppercase mb-1 border border-emerald-300/40 shadow-sm">Actual Spend</span>
                        <p class="text-xl font-black text-emerald-600 dark:text-emerald-400">$${item.spent}</p>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function saveAdminSettings() {
    triggerHaptic('heavy');
    bankrollGbp = document.getElementById('input-gbp-limit').value;
    localStorage.setItem('bankrollGbp', bankrollGbp);
    localStorage.setItem('holidayBudget_v5.3', JSON.stringify(tripData));
    switchTab('Home');
}

function wipeForSharing() {
    triggerHaptic('error');
    if(confirm("⚠️ Share Mode Reset: This will wipe ALL budgets, spent amounts, and custom activity notes. Only the dates and locations will remain. Use this before sharing the app template. Proceed?")) {
        tripData = tripData.map(item => ({
            day: item.day, loc: item.loc, activity: "", cat: "🛍️ Mixed", usd: 0, spent: 0
        }));
        fuelEntries = []; bankrollGbp = 0;
        document.getElementById('input-gbp-limit').value = 0;
        localStorage.setItem('holidayBudget_v5.3', JSON.stringify(tripData));
        localStorage.setItem('holidayFuel_v5.3', JSON.stringify(fuelEntries));
        localStorage.setItem('bankrollGbp', bankrollGbp);
        window.location.reload(true);
    }
}

function factoryReset() {
    triggerHaptic('error');
    if(confirm("⚠️ WARNING: This will restore the default original itinerary (with pre-filled notes). Are you sure?")) {
        localStorage.removeItem('holidayBudget_v5.3');
        localStorage.removeItem('holidayFuel_v5.3');
        tripData = JSON.parse(JSON.stringify(defaultData));
        fuelEntries = [];
        localStorage.setItem('holidayBudget_v5.3', JSON.stringify(tripData));
        localStorage.setItem('holidayFuel_v5.3', JSON.stringify(fuelEntries));
        window.location.reload(true);
    }
}

function renderLocalFuelList(loc) {
    const listData = fuelEntries.filter(e => e.loc === loc);
    const total = listData.reduce((s, e) => s + e.usd, 0);
    const tbody = document.getElementById('local-fuel-list');
    if (listData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-slate-500 text-xs">No entries yet.</td></tr>`;
    } else {
        tbody.innerHTML = listData.map(e => `
            <tr>
                <td class="py-2.5 font-medium">${e.date}</td>
                <td class="py-2.5 text-right font-black text-white">$${e.usd}</td>
                <td class="py-2.5 text-right pl-2">
                    <button onclick="triggerHaptic('light'); deleteFuelEntry(${e.id})" class="text-rose-500 hover:text-rose-400 active:scale-90">🗑️</button>
                </td>
            </tr>
        `).join('');
    }
    document.getElementById('local-fuel-total').innerText = `$${total}`;
}

function openFuelEdit(loc) {
    triggerHaptic('light');
    editingFuelLoc = loc;
    document.getElementById('local-fuel-modal-title').innerText = `${loc} Fuel Log`;
    document.getElementById('new-fuel-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-fuel-usd').value = '';
    renderLocalFuelList(loc);
    toggleLocalFuelModal(true);
}

function addLocalFuel() {
    triggerHaptic('success');
    const dateVal = document.getElementById('new-fuel-date').value || "Undated";
    const amtVal = parseFloat(document.getElementById('new-fuel-usd').value);
    if(!amtVal || amtVal <= 0) return alert("Please enter a valid amount.");

    fuelEntries.push({ id: Date.now(), loc: editingFuelLoc, date: dateVal, usd: amtVal });
    localStorage.setItem('holidayFuel_v5.3', JSON.stringify(fuelEntries));
    
    document.getElementById('new-fuel-usd').value = '';
    renderLocalFuelList(editingFuelLoc);
    renderGrid(editingFuelLoc);
}

function deleteFuelEntry(id) {
    if(confirm("Remove this fuel entry?")) {
        triggerHaptic('heavy');
        fuelEntries = fuelEntries.filter(e => e.id !== id);
        localStorage.setItem('holidayFuel_v5.3', JSON.stringify(fuelEntries));
        
        if(editingFuelLoc) {
            renderLocalFuelList(editingFuelLoc);
            renderGrid(editingFuelLoc);
        } else {
            renderGlobalFuelList();
            updateDashboard();
        }
    }
}

function toggleLocalFuelModal(show) {
    const m = document.getElementById('local-fuel-modal');
    if (show) {
        m.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.add('modal-active');
        lockScroll();
    } else {
        m.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.remove('modal-active');
        unlockScroll();
    }
}

function renderGlobalFuelList() {
    const total = fuelEntries.reduce((s, e) => s + e.usd, 0);
    const tbody = document.getElementById('global-fuel-list');
    
    if (fuelEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-slate-500 text-xs">No holiday fuel logged yet.</td></tr>`;
    } else {
        tbody.innerHTML = fuelEntries.map(e => `
            <tr>
                <td class="py-3 font-medium text-[10px] leading-tight">${e.date}<br><button onclick="triggerHaptic(); deleteFuelEntry(${e.id})" class="text-rose-500 text-[10px]">Delete</button></td>
                <td class="py-3 font-black text-slate-400 uppercase text-[10px]">${e.loc}</td>
                <td class="py-3 text-right font-black text-white">$${e.usd}</td>
            </tr>
        `).join('');
    }
    document.getElementById('global-fuel-total').innerText = `$${total}`;
    document.getElementById('global-fuel-total-gbp').innerText = `£${(total/exchangeRate).toFixed(0)}`;
}

function openGlobalFuelModal() {
    triggerHaptic('light');
    editingFuelLoc = null; 
    renderGlobalFuelList();
    toggleGlobalFuelModal(true);
}

function toggleGlobalFuelModal(show) {
    const m = document.getElementById('global-fuel-modal');
    if (show) {
        m.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.add('modal-active');
        lockScroll();
    } else {
        m.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.remove('modal-active');
        unlockScroll();
    }
}

function openEdit(index) {
    editingIndex = index;
    const item = tripData[index];
    document.getElementById('modal-title').innerText = item.day;
    document.getElementById('edit-cat').value = item.cat || "🛍️ Mixed";
    document.getElementById('edit-usd').value = item.usd;
    document.getElementById('edit-spent').value = item.spent;
    document.getElementById('edit-activity').value = item.activity;
    toggleModal(true);
}

function saveChanges() {
    const usd = parseFloat(document.getElementById('edit-usd').value) || 0;
    const spent = parseFloat(document.getElementById('edit-spent').value) || 0;
    
    tripData[editingIndex].cat = document.getElementById('edit-cat').value;
    tripData[editingIndex].usd = usd;
    tripData[editingIndex].spent = spent;
    tripData[editingIndex].activity = document.getElementById('edit-activity').value;
    
    localStorage.setItem('holidayBudget_v5.3', JSON.stringify(tripData));

    if(spent > usd && usd > 0) {
        triggerHaptic('error');
        const modalCard = document.getElementById('modal-card');
        modalCard.classList.add('shake-anim');
        setTimeout(() => {
            modalCard.classList.remove('shake-anim');
            toggleModal(false);
            switchTab(currentTab, false);
        }, 400);
    } else if (spent > 0 && spent <= usd) {
        triggerHaptic('success');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 100, colors: ['#4338ca', '#10b981', '#f59e0b'] });
        toggleModal(false);
        switchTab(currentTab, false);
    } else {
        triggerHaptic('light');
        toggleModal(false);
        switchTab(currentTab, false);
    }
}

function toggleModal(show) {
    if(!show) triggerHaptic('light');
    const m = document.getElementById('modal');
    if (show) {
        m.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.add('modal-active');
        lockScroll();
    } else {
        m.classList.add('opacity-0', 'pointer-events-none');
        document.body.classList.remove('modal-active');
        unlockScroll();
    }
}

async function systemSync() {
    triggerHaptic('light');
    await fetchRates();
    updateDashboard();
    updateHeaderStats(currentTab);
    alert("🚀 Live Rates Synced.");
}

function forceAppUpdate() {
    triggerHaptic('light');
    if(confirm("Force App Update? This clears the cache to pull new code.")) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
        }
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
              .then(() => window.location.reload(true));
    }
}

// Map variables to window for inline HTML onclick calls
window.switchTab = switchTab;
window.openGlobalFuelModal = openGlobalFuelModal;
window.setThemeMode = setThemeMode; // NEW
window.saveAdminSettings = saveAdminSettings;
window.systemSync = systemSync;
window.forceAppUpdate = forceAppUpdate;
window.wipeForSharing = wipeForSharing;
window.factoryReset = factoryReset;
window.openEdit = openEdit;
window.saveChanges = saveChanges;
window.toggleModal = toggleModal;
window.openFuelEdit = openFuelEdit;
window.addLocalFuel = addLocalFuel;
window.deleteFuelEntry = deleteFuelEntry;
window.toggleLocalFuelModal = toggleLocalFuelModal;
window.toggleGlobalFuelModal = toggleGlobalFuelModal;
window.triggerHaptic = triggerHaptic;

// Boot
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
