// js/admin.js
import { db, auth } from './firebase-config.js';
import {
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
    query, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const BOOKINGS_COLLECTION = 'bookings';

/* =========================================================
   AUTH
   ========================================================= */
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmailEl = document.getElementById('adminEmail');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmailInput').value.trim();
    const password = document.getElementById('adminPasswordInput').value;
    loginError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        loginError.textContent = '❌ Invalid email or password.';
        console.error(err);
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        adminEmailEl.textContent = user.email;
        loadBookings();
    } else {
        loginScreen.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
    }
});

/* =========================================================
   BOOKINGS — REAL-TIME LIST
   ========================================================= */
let allBookings = [];
const bookingsTbody = document.getElementById('bookingsTbody');
const bookingsCount = document.getElementById('bookingsCount');
const searchInput = document.getElementById('searchInput');
const filterEventType = document.getElementById('filterEventType');
const filterDate = document.getElementById('filterDate');
const exportBtn = document.getElementById('exportBtn');

function loadBookings() {
    const q = query(collection(db, BOOKINGS_COLLECTION), orderBy('created_at', 'desc'));
    onSnapshot(q, (snapshot) => {
        allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBookings();
    }, (err) => {
        console.error('Firestore error:', err);
    });
}

function renderBookings() {
    const search = searchInput.value.toLowerCase();
    const eventFilter = filterEventType.value;
    const dateFilter = filterDate.value;

    const filtered = allBookings.filter(b => {
        const matchesSearch = !search ||
            (b.name || '').toLowerCase().includes(search) ||
            (b.phone || '').includes(search) ||
            (b.email || '').toLowerCase().includes(search);
        const matchesEvent = !eventFilter || b.event_type === eventFilter;
        const matchesDate = !dateFilter || b.event_date === dateFilter;
        return matchesSearch && matchesEvent && matchesDate;
    });

    bookingsCount.textContent = `${filtered.length} booking${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        bookingsTbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-400">No bookings found</td></tr>`;
        return;
    }

    bookingsTbody.innerHTML = filtered.map(b => `
        <tr class="border-b border-gray-100 hover:bg-cream/50 transition">
            <td class="px-3 py-3 text-xs">${formatDate(b.created_at)}</td>
            <td class="px-3 py-3 font-medium">${escapeHtml(b.name || '—')}</td>
            <td class="px-3 py-3 text-sm">
                <a href="tel:${escapeHtml(b.phone)}" class="text-maroon hover:underline">${escapeHtml(b.phone || '—')}</a>
            </td>
            <td class="px-3 py-3 text-sm">
                <a href="mailto:${escapeHtml(b.email)}" class="text-maroon hover:underline">${escapeHtml(b.email || '—')}</a>
            </td>
            <td class="px-3 py-3 text-sm">
                <span class="bg-gold/20 text-maroon px-2 py-0.5 rounded-full text-xs font-medium">${escapeHtml(b.event_type || '—')}</span>
            </td>
            <td class="px-3 py-3 text-sm">${formatDateShort(b.event_date)}</td>
            <td class="px-3 py-3 text-sm text-center">${b.guests || '—'}</td>
            <td class="px-3 py-3 text-right whitespace-nowrap">
                <button onclick="editBooking('${b.id}')" class="text-blue-600 hover:text-blue-800 px-2" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteBooking('${b.id}')" class="text-red-600 hover:text-red-800 px-2" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/* =========================================================
   FILTERS
   ========================================================= */
searchInput.addEventListener('input', renderBookings);
filterEventType.addEventListener('change', renderBookings);
filterDate.addEventListener('change', renderBookings);

/* =========================================================
   ADD / EDIT MODAL
   ========================================================= */
const modal = document.getElementById('bookingModal');
const modalTitle = document.getElementById('modalTitle');
const bookingForm = document.getElementById('adminBookingForm');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const openAddModalBtn = document.getElementById('openAddModalBtn');

let editingId = null;

openAddModalBtn.addEventListener('click', () => openModal());
cancelModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function openModal(booking = null) {
    editingId = booking?.id || null;
    modalTitle.textContent = booking ? 'Edit Booking' : 'Add New Booking';
    bookingForm.reset();

    if (booking) {
        bookingForm.name.value = booking.name || '';
        bookingForm.phone.value = booking.phone || '';
        bookingForm.email.value = booking.email || '';
        bookingForm.event_type.value = booking.event_type || '';
        bookingForm.event_date.value = booking.event_date || '';
        bookingForm.guests.value = booking.guests || '';
        bookingForm.message.value = booking.message || '';
        bookingForm.status.value = booking.status || 'confirmed';
    } else {
        bookingForm.status.value = 'confirmed';
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingId = null;
}

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: bookingForm.name.value.trim(),
        phone: bookingForm.phone.value.trim(),
        email: bookingForm.email.value.trim(),
        event_type: bookingForm.event_type.value,
        event_date: bookingForm.event_date.value,
        guests: Number(bookingForm.guests.value) || null,
        message: bookingForm.message.value.trim(),
        status: bookingForm.status.value,
        source: 'admin'
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, BOOKINGS_COLLECTION, editingId), {
                ...data,
                updated_at: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, BOOKINGS_COLLECTION), {
                ...data,
                created_at: serverTimestamp()
            });
        }
        closeModal();
    } catch (err) {
        alert('❌ Error saving booking: ' + err.message);
    }
});

window.editBooking = (id) => {
    const b = allBookings.find(x => x.id === id);
    if (b) openModal(b);
};

window.deleteBooking = async (id) => {
    if (!confirm('Delete this booking permanently?')) return;
    try {
        await deleteDoc(doc(db, BOOKINGS_COLLECTION, id));
    } catch (err) {
        alert('❌ Error deleting: ' + err.message);
    }
};

/* =========================================================
   EXPORT TO CSV
   ========================================================= */
exportBtn.addEventListener('click', () => {
    if (allBookings.length === 0) {
        alert('No bookings to export.');
        return;
    }
    const headers = ['Date Submitted', 'Name', 'Phone', 'Email', 'Event Type', 'Event Date', 'Guests', 'Status', 'Notes'];
    const rows = allBookings.map(b => [
        formatDate(b.created_at),
        b.name || '',
        b.phone || '',
        b.email || '',
        b.event_type || '',
        b.event_date || '',
        b.guests || '',
        b.status || '',
        (b.message || '').replace(/[\r\n,]/g, ' ')
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rayyan-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

/* =========================================================
   HELPERS
   ========================================================= */
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
