// Firebase Setup (CDN v9 Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/** 
 * USER ACTION REQUIRED:
 * Replace the config below with your Firebase Project settings
 * To get this: 
 * 1. Go to console.firebase.google.com
 * 2. Create a Project
 * 3. Add a "Web" app
 * 4. Paste the config object here
 */
const firebaseConfig = {
    "project_info": {
        "project_number": "91344630677",
        "project_id": "buildinggateapp",
        "storage_bucket": "buildinggateapp.firebasestorage.app"
    },
    "client": [
        {
            "client_info": {
                "mobilesdk_app_id": "1:91344630677:android:cac0fb1eba560a5451bc9c",
                "android_client_info": {
                    "package_name": "com.arv.com"
                }
            },
            "oauth_client": [],
            "api_key": [
                {
                    "current_key": "AIzaSyAEDDrG8yd2sDqudb9otlqccQWJTmX9uCc"
                }
            ],
            "services": {
                "appinvite_service": {
                    "other_platform_oauth_client": []
                }
            }
        }
    ],
    "configuration_version": "1"
}

// Initialize app only if config is provided
let db;
let isFirebaseConfigured = false;

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseConfigured = true;
    document.getElementById('sync-dot').style.background = '#22c55e';
    document.getElementById('sync-text').innerText = 'Live Sync Active';
} else {
    console.warn("Firebase not configured. Using local storage for demo purposes.");
    document.getElementById('sync-dot').style.background = '#eab308';
    document.getElementById('sync-text').innerText = 'Demo Mode (Offline)';
}

// UI Elements
const activeList = document.getElementById('active-list');
const historyList = document.getElementById('history-list');
const entryForm = document.getElementById('entry-form');

// State
let visitors = [];

// Helper: Format Dates
const formatTime = (date) => {
    if (!date) return '---';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

// Logic: Load Active Visitors
const loadActiveVisitors = () => {
    if (!isFirebaseConfigured) {
        // Fallback to localStorage for demo
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        renderVisitors(localData.filter(v => v.status === 'active'));
        return;
    }

    const q = query(collection(db, "visitors"), where("status", "==", "active"), orderBy("timeIn", "desc"));
    onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderVisitors(data);
    });
};

// Logic: Load History
const loadHistory = () => {
    if (!isFirebaseConfigured) {
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        renderHistory(localData.filter(v => v.status === 'exited').sort((a, b) => b.timeOut - a.timeOut));
        return;
    }

    const q = query(collection(db, "visitors"), where("status", "==", "exited"), orderBy("timeOut", "desc"), limit(50));
    onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHistory(data);
    });
};

// Logic: Render Active Visitors
const renderVisitors = (data) => {
    if (data.length === 0) {
        activeList.innerHTML = `<div class="empty-state" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><p>No active visitors at the moment.</p></div>`;
        return;
    }

    activeList.innerHTML = data.map(v => `
        <div class="visitor-card">
            <div class="visitor-info">
                <h3>${v.name}</h3>
                <p>${v.purpose} • Flat ${v.flat}</p>
                <p style="font-size: 0.75rem;">Entered: ${formatTime(v.timeIn)}</p>
                ${v.vehicle ? `<p style="font-size: 0.75rem; color: var(--primary);">🚗 ${v.vehicle}</p>` : ''}
            </div>
            <button class="btn-exit" onclick="handleExit('${v.id}')">EXIT</button>
        </div>
    `).join('');
};

// Logic: Render History
const renderHistory = (data) => {
    if (data.length === 0) {
        historyList.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--text-muted);">No history logs yet.</p>`;
        return;
    }

    historyList.innerHTML = data.map(v => `
        <div class="history-item">
            <div style="display:flex; justify-content: space-between; margin-bottom: 4px;">
                <span font-weight: 600;">${v.name}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(v.timeIn)}</span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-muted);">
                ${v.flat} • ${v.purpose}
            </div>
            <div style="font-size: 0.75rem; margin-top: 4px;">
                In: ${formatTime(v.timeIn)} • Out: ${formatTime(v.timeOut)}
            </div>
        </div>
    `).join('');
};

// Event: Submit Entry
entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newVisitor = {
        name: document.getElementById('visitor-name').value,
        phone: document.getElementById('visitor-phone').value,
        flat: document.getElementById('visitor-flat').value,
        purpose: document.getElementById('visitor-purpose').value,
        vehicle: document.getElementById('visitor-vehicle').value,
        status: 'active',
        timeIn: isFirebaseConfigured ? serverTimestamp() : new Date()
    };

    if (isFirebaseConfigured) {
        await addDoc(collection(db, "visitors"), newVisitor);
    } else {
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        newVisitor.id = Date.now().toString();
        localData.push(newVisitor);
        localStorage.setItem('visitors', JSON.stringify(localData));
        loadActiveVisitors();
    }

    entryForm.reset();
    // Use the global switchView function
    document.querySelector('.nav-item[onclick*="active"]').click();
});

// Event: Handle Exit
window.handleExit = async (id) => {
    if (isFirebaseConfigured) {
        const ref = doc(db, "visitors", id);
        await updateDoc(ref, {
            status: 'exited',
            timeOut: serverTimestamp()
        });
    } else {
        const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
        const idx = localData.findIndex(v => v.id === id);
        if (idx !== -1) {
            localData[idx].status = 'exited';
            localData[idx].timeOut = new Date();
            localStorage.setItem('visitors', JSON.stringify(localData));
            loadActiveVisitors();
            loadHistory();
        }
    }
};

// Init
loadActiveVisitors();
loadHistory();
