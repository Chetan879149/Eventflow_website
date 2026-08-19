// ============================================================
// EventFlow - Admin Dashboard
// ============================================================

window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${iconClass} toast-icon"></i><div class="toast-content">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

(async () => {
    try {
        const me = await window.authApi.getMe();

        if (!me || !me.ok || !me.user) {
            window.location.replace('/login.html');
            return;
        }

        if (me.user.role !== 'admin') {
            window.location.replace('/index.html');
            return;
        }

        console.log('Admin authenticated:', me.user);

    } catch (error) {
        console.error('Admin authentication error:', error);
        window.location.replace('/login.html');
    }
})();


// ============================================================
// Table Configuration
// ============================================================

const tableConfigs = {

    users: {
        title: 'Users',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email' },
            { key: 'username', label: 'Username' },
            { key: 'phone', label: 'Phone' },
            { key: 'location', label: 'Location' },
            { key: 'role', label: 'Role' },
            { key: 'createdAt', label: 'Created At' }
        ]
    },

    events: {
        title: 'Events',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'title', label: 'Title' },
            { key: 'eventDate', label: 'Event Date' },
            { key: 'eventTime', label: 'Event Time' },
            { key: 'location', label: 'Location' },
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'ticketPrice', label: 'Ticket Price' },
            { key: 'maxAttendees', label: 'Max Attendees' },
            { key: 'imagePath', label: 'Image' },
            { key: 'organizerFirstName', label: 'Organizer First Name' },
            { key: 'organizerLastName', label: 'Organizer Last Name' },
            { key: 'organizerEmail', label: 'Organizer Email' },
            { key: 'createdAt', label: 'Created At' }
        ]
    },

    contacts: {
        title: 'Contacts',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email' },
            { key: 'subject', label: 'Subject' },
            { key: 'message', label: 'Message' },
            { key: 'createdAt', label: 'Created At' }
        ]
    },

    bookings: {
        title: 'Bookings',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'eventId', label: 'Event ID' },
            { key: 'userId', label: 'User ID' },
            { key: 'attendeeName', label: 'Attendee Name' },
            { key: 'attendeeEmail', label: 'Attendee Email' },
            { key: 'ticketQuantity', label: 'Ticket Quantity' },
            { key: 'totalPrice', label: 'Total Price' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Created At' }
        ]
    },

    favorites: {
        title: 'Favorites',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'userId', label: 'User ID' },
            { key: 'eventId', label: 'Event ID' },
            { key: 'userEmail', label: 'User Email' },
            { key: 'eventTitle', label: 'Event Title' },
            { key: 'createdAt', label: 'Created At' }
        ]
    },

    sessions: {
        title: 'Sessions',
        columns: [
            { key: 'id', label: 'ID' },
            { key: 'userId', label: 'User ID' },
            { key: 'userEmail', label: 'User Email' },
            { key: 'sessionToken', label: 'Session Token' },
            { key: 'createdAt', label: 'Created At' },
            { key: 'expiresAt', label: 'Expires At' }
        ]
    }
};


// ============================================================
// DOM Elements
// ============================================================

const statsGrid = document.getElementById('statsGrid');
const tableSelect = document.getElementById('tableSelect');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const tableMeta = document.getElementById('tableMeta');
const refreshBtn = document.getElementById('refreshBtn');
const createAdminBtn = document.getElementById('createAdminBtn');

const editModal = document.getElementById('editModal');
const editModalTitle = document.getElementById('editModalTitle');
const editForm = document.getElementById('editForm');
const editFields = document.getElementById('editFields');

let currentTableName = 'users';
let currentRows = [];
let editingRow = null;


// ============================================================
// Table Actions
// ============================================================

const tableActions = {
    users: ['edit', 'delete'],
    events: ['edit', 'delete'],
    contacts: ['edit', 'delete'],
    bookings: ['edit', 'delete'],
    favorites: ['delete'],
    sessions: ['delete']
};


// ============================================================
// Editable Fields
// ============================================================

const editableFields = {

    users: [
        {
            key: 'firstName',
            label: 'First Name',
            type: 'text'
        },
        {
            key: 'lastName',
            label: 'Last Name',
            type: 'text'
        },
        {
            key: 'email',
            label: 'Email',
            type: 'email'
        },
        {
            key: 'password',
            label: 'New Password',
            type: 'password',
            optional: true
        }
    ],

    events: [
        {
            key: 'title',
            label: 'Title',
            type: 'text'
        },
        {
            key: 'eventDate',
            label: 'Event Date',
            type: 'date'
        },
        {
            key: 'eventTime',
            label: 'Event Time',
            type: 'time'
        },
        {
            key: 'location',
            label: 'Location',
            type: 'text'
        },
        {
            key: 'category',
            label: 'Category',
            type: 'text'
        },
        {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            fullWidth: true
        },
        {
            key: 'ticketPrice',
            label: 'Ticket Price',
            type: 'number'
        },
        {
            key: 'maxAttendees',
            label: 'Max Attendees',
            type: 'number'
        },
        {
            key: 'imagePath',
            label: 'Image Path',
            type: 'text',
            fullWidth: true
        }
    ],

    contacts: [
        {
            key: 'firstName',
            label: 'First Name',
            type: 'text'
        },
        {
            key: 'lastName',
            label: 'Last Name',
            type: 'text'
        },
        {
            key: 'email',
            label: 'Email',
            type: 'email'
        },
        {
            key: 'subject',
            label: 'Subject',
            type: 'text'
        },
        {
            key: 'message',
            label: 'Message',
            type: 'textarea',
            fullWidth: true
        }
    ],

    bookings: [
        {
            key: 'attendeeName',
            label: 'Attendee Name',
            type: 'text'
        },
        {
            key: 'attendeeEmail',
            label: 'Attendee Email',
            type: 'email'
        },
        {
            key: 'ticketQuantity',
            label: 'Ticket Quantity',
            type: 'number'
        },
        {
            key: 'totalPrice',
            label: 'Total Price',
            type: 'number'
        },
        {
            key: 'status',
            label: 'Status',
            type: 'text'
        }
    ]
};


// ============================================================
// API Request Helper
// ============================================================

const apiRequest = async (url, options = {}) => {

    const token = window.authApi?.getSessionToken?.();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            payload.error ||
            payload.message ||
            `Request failed with status ${response.status}`
        );
    }

    return payload;
};


// ============================================================
// HTML Escape Helper
// ============================================================

const escapeHtml = (value) => {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};


// ============================================================
// Format Value
// ============================================================

const formatValue = (value) => {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return '<span class="text-gray-500">-</span>';
    }

    let text = String(value);

    if (text.length > 120) {
        text = `${text.slice(0, 120)}...`;
    }

    return escapeHtml(text);
};


// ============================================================
// Render Statistics
// ============================================================

const renderStats = async () => {

    const stats = await apiRequest('/api/admin/stats');

    const items = [
        ['Users', stats.users ?? 0],
        ['Admins', stats.admin ?? 0],
        ['Events', stats.events ?? 0],
        ['Contacts', stats.contacts ?? 0],
        ['Bookings', stats.bookings ?? 0],
        ['Favorites', stats.favorites ?? 0],
        ['Sessions', stats.sessions ?? 0]
    ];

    statsGrid.innerHTML = items.map(([label, value]) => `
        <div class="glass-card rounded-3xl p-6 border border-white/10">

            <p class="text-gray-400 text-sm uppercase tracking-[0.2em]">
                ${escapeHtml(label)}
            </p>

            <div class="text-4xl font-bold mt-3 gradient-text">
                ${escapeHtml(value)}
            </div>

        </div>
    `).join('');
};


// ============================================================
// Render Actions
// ============================================================

const renderActions = (tableName, row) => {

    const actions = tableActions[tableName] || [];

    if (actions.length === 0) {
        return '';
    }

    const buttons = [];

    if (actions.includes('edit')) {

        buttons.push(`
            <button
                class="px-3 py-2 rounded-lg bg-primary-500/20 text-primary-200 hover:bg-primary-500/30 transition-colors"
                data-action="edit"
                data-table="${escapeHtml(tableName)}"
                data-id="${escapeHtml(row.id)}">
                Edit
            </button>
        `);
    }

    if (actions.includes('delete')) {

        buttons.push(`
            <button
                class="px-3 py-2 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
                data-action="delete"
                data-table="${escapeHtml(tableName)}"
                data-id="${escapeHtml(row.id)}">
                Delete
            </button>
        `);
    }

    return `
        <td class="px-4 py-4 border-t border-white/10 whitespace-nowrap">
            <div class="flex gap-2">
                ${buttons.join('')}
            </div>
        </td>
    `;
};


// ============================================================
// Render Table
// ============================================================

const renderTable = async (tableName) => {

    const config = tableConfigs[tableName];

    if (!config) {
        console.error(`Unknown table: ${tableName}`);
        return;
    }

    currentTableName = tableName;

    tableMeta.textContent =
        `Showing ${config.title.toLowerCase()} stored in SQLite.`;

    // Render table headings
    tableHead.innerHTML = `
        <tr>

            ${config.columns.map(column => `
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    ${escapeHtml(column.label)}
                </th>
            `).join('')}

            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Actions
            </th>

        </tr>
    `;

    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td
                colspan="${config.columns.length + 1}"
                class="px-4 py-8 text-center text-gray-400">
                Loading...
            </td>
        </tr>
    `;

    try {

        const result = await apiRequest(
            `/api/admin/records?table=${encodeURIComponent(tableName)}`
        );

        const rows = Array.isArray(result.rows)
            ? result.rows
            : [];

        currentRows = rows;

        if (rows.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="${config.columns.length + 1}"
                        class="px-4 py-8 text-center text-gray-400">
                        No records found.
                    </td>
                </tr>
            `;

            return;
        }

        // IMPORTANT:
        // column is an object.
        // We MUST use column.key to access the database value.
        tableBody.innerHTML = rows.map(row => {

            const cells = config.columns.map(column => {

                const value = row[column.key];

                return `
                    <td class="px-4 py-4 border-t border-white/10 text-sm align-top">
                        ${formatValue(value)}
                    </td>
                `;

            }).join('');

            return `
                <tr class="align-top hover:bg-white/5 transition-colors">

                    ${cells}

                    ${renderActions(tableName, row)}

                </tr>
            `;

        }).join('');

    } catch (error) {

        console.error(
            `Unable to load ${tableName}:`,
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="${config.columns.length + 1}"
                    class="px-4 py-8 text-center text-red-300">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
};


// ============================================================
// Open Edit Modal
// ============================================================

const openEditModal = (tableName, rowId) => {

    const row = currentRows.find(
        item => Number(item.id) === Number(rowId)
    );

    if (!row) {
        console.error('Record not found:', rowId);
        return;
    }

    editingRow = {
        tableName,
        row
    };

    const fields = editableFields[tableName] || [];

    const title = tableConfigs[tableName]?.title || tableName;

    editModalTitle.textContent =
        `Edit ${title.endsWith('s') ? title.slice(0, -1) : title}`;

    editFields.innerHTML = fields.map(field => {

        const value = row[field.key] ?? '';

        const safeValue =
            field.key === 'password'
                ? ''
                : escapeHtml(value);

        if (field.type === 'textarea') {

            return `
                <label
                    class="${field.fullWidth ? 'md:col-span-2' : ''} block">

                    <span class="block text-sm font-medium mb-2 text-gray-300">
                        ${escapeHtml(field.label)}
                    </span>

                    <textarea
                        name="${escapeHtml(field.key)}"
                        rows="4"
                        class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary-500"
                    >${safeValue}</textarea>

                </label>
            `;
        }

        return `
            <label
                class="${field.fullWidth ? 'md:col-span-2' : ''} block">

                <span class="block text-sm font-medium mb-2 text-gray-300">
                    ${escapeHtml(field.label)}
                </span>

                <input
                    name="${escapeHtml(field.key)}"
                    type="${escapeHtml(field.type)}"
                    value="${safeValue}"
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-primary-500"
                >

            </label>
        `;

    }).join('');

    editModal.classList.remove('hidden');

    document.body.style.overflow = 'hidden';
};


// ============================================================
// Close Edit Modal
// ============================================================

const closeEditModal = () => {

    editingRow = null;

    editModal.classList.add('hidden');

    document.body.style.overflow = 'auto';

    editForm.reset();
};


// ============================================================
// Edit Form Submit
// ============================================================

editForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    if (!editingRow) {
        return;
    }

    const formData = new FormData(editForm);

    const payload = Object.fromEntries(
        formData.entries()
    );

    try {

        await apiRequest(
            `/api/admin/records/${editingRow.tableName}/${editingRow.row.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        closeEditModal();

        await refreshDashboard();

    } catch (error) {

        console.error('Update error:', error);

        window.showToast(
            `Update Failed:\n` + Object.entries(payload).map(([col, val]) => `${col} = ${val}`).join('\n'), 'error'
        );
    }
});


// ============================================================
// Delete / Edit Button Handler
// ============================================================

document.addEventListener('click', async (event) => {

    const actionButton =
        event.target.closest('[data-action]');

    if (!actionButton) {
        return;
    }

    const tableName =
        actionButton.dataset.table;

    const rowId =
        actionButton.dataset.id;

    const action =
        actionButton.dataset.action;

    // ---------------------------
    // Edit
    // ---------------------------

    if (action === 'edit') {

        openEditModal(
            tableName,
            rowId
        );

        return;
    }

    // ---------------------------
    // Delete
    // ---------------------------

    if (action === 'delete') {

        const confirmed =
            window.confirm(
                'Are you sure you want to delete this record?'
            );

        if (!confirmed) {
            return;
        }

        try {

            await apiRequest(
                `/api/admin/records/${tableName}/${rowId}`,
                {
                    method: 'DELETE'
                }
            );

            await refreshDashboard();

        } catch (error) {

            console.error(
                'Delete error:',
                error
            );

            window.showToast(
                `Delete Failed:\nRow ID = ${rowId}`, 'error'
            );
        }
    }
});


// ============================================================
// Close Modal Buttons
// ============================================================

document
    .querySelectorAll('[data-close-edit-modal]')
    .forEach(button => {

        button.addEventListener(
            'click',
            closeEditModal
        );
    });


// ============================================================
// Refresh Dashboard
// ============================================================

const refreshDashboard = async () => {

    try {

        await renderStats();

        await renderTable(
            tableSelect.value
        );

    } catch (error) {

        console.error(
            'Dashboard refresh error:',
            error
        );
    }
};


// ============================================================
// Initialize Dashboard
// ============================================================

if (tableSelect) {

    tableSelect.addEventListener(
        'change',
        () => {
            renderTable(
                tableSelect.value
            );
        }
    );
}

if (refreshBtn) {
    
    refreshBtn.addEventListener(
        'click',
        refreshDashboard
    );
}

if (createAdminBtn) {
    createAdminBtn.addEventListener('click', async () => {
        const firstName = window.prompt('Admin first name:');
        if (!firstName || !firstName.trim()) {
            return;
        }

        const lastName = window.prompt('Admin last name:');
        if (!lastName || !lastName.trim()) {
            return;
        }

        const email = window.prompt('Admin email:');
        if (!email || !email.trim()) {
            return;
        }

        const password = window.prompt('Admin password (at least 8 characters):', '');
        if (!password || password.trim().length < 8) {
            window.showToast('Password must be at least 8 characters long.', 'error');
            return;
        }

        try {
            await apiRequest('/api/admin/create-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim(),
                    password: password.trim()
                })
            });

            window.showToast('Admin account created successfully.', 'success');
            await refreshDashboard();
        } catch (error) {
            console.error('Create admin error:', error);
            window.showToast(error.message || 'Unable to create admin account.', 'error');
        }
    });
}

if (editModal) {

    editModal.addEventListener(
        'click',
        (event) => {

            if (
                event.target === editModal
            ) {
                closeEditModal();
            }

        }
    );
}


// Start dashboard
refreshDashboard();