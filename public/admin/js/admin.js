/**
 * PowerHouse Gym Admin Dashboard - JavaScript
 * Complete CMS functionality
 */

// ========================================
// CONFIGURATION
// ========================================
const API_URL = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('adminUser') || 'null');

// ========================================
// AUTH CHECK
// ========================================
if (!authToken) {
    window.location.href = '/admin/';
}

// Verify token is valid
fetch(`${API_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
}).then(res => {
    if (!res.ok) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/';
    }
}).catch(() => {
    window.location.href = '/admin/';
});

// ========================================
// API UTILITIES
// ========================================
async function api(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API Error (Non-JSON response):', text);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

async function apiUpload(endpoint, formData) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
    }
    
    return data;
}

// ========================================
// UI UTILITIES
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    setTimeout(() => toast.classList.remove('active'), 3000);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function getStatusBadge(status) {
    const statusMap = {
        'published': 'published',
        'draft': 'draft',
        'active': 'active',
        'inactive': 'inactive',
        'new': 'new',
        'pending': 'pending',
        'read': 'active',
        'unread': 'new'
    };
    return `<span class="status-badge status-${statusMap[status] || 'draft'}">${status}</span>`;
}

// ========================================
// MODAL FUNCTIONS
// ========================================
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

function openModal(title, content, onConfirm, confirmText = 'Save') {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modalConfirm.textContent = confirmText;
    modal.classList.add('active');
    
    modalConfirm.onclick = async () => {
        try {
            await onConfirm();
            closeModal();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
}

function closeModal() {
    modal.classList.remove('active');
    modalBody.innerHTML = '';
}

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// ========================================
// NAVIGATION
// ========================================
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('pageTitle');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileToggle = document.getElementById('mobileToggle');

function showSection(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById(`section-${sectionId}`);
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    
    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');
    
    pageTitle.textContent = navItem?.querySelector('.nav-text')?.textContent || 'Dashboard';
    
    // Load section data
    loadSectionData(sectionId);
    
    // Close mobile sidebar
    sidebar.classList.remove('active');
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        window.location.hash = section;
        showSection(section);
    });
});

// Quick action buttons
document.querySelectorAll('.action-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const section = btn.dataset.section;
        window.location.hash = section;
        showSection(section);
    });
});

// Handle hash change
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    showSection(hash);
});

// Mobile sidebar toggle
mobileToggle?.addEventListener('click', () => sidebar.classList.toggle('active'));
sidebarToggle?.addEventListener('click', () => sidebar.classList.toggle('active'));

// ========================================
// DATA LOADING
// ========================================
async function loadSectionData(section) {
    switch(section) {
        case 'dashboard': await loadDashboard(); break;
        case 'pages': await loadPages(); break;
        case 'blog': await loadBlog(); break;
        case 'media': await loadMedia(); break;
        case 'gallery': await loadGallery(); break;
        case 'trainers': await loadTrainers(); break;
        case 'classes': await loadClasses(); break;
        case 'membership': await loadMembership(); break;
        case 'testimonials': await loadTestimonials(); break;
        case 'messages': await loadMessages(); break;
        case 'design': await loadDesign(); break;
        case 'settings': await loadSettings(); break;
    }
}

// ========================================
// DASHBOARD
// ========================================
async function loadDashboard() {
    try {
        // Load stats
        const [blog, classes, messages] = await Promise.all([
            api('/blog'),
            api('/classes'),
            api('/contact/submissions')
        ]);
        
        document.getElementById('totalPosts').textContent = blog.posts?.length || 0;
        document.getElementById('totalClasses').textContent = classes?.length || 0;
        document.getElementById('unreadMessages').textContent = messages.unread || 0;
        document.getElementById('totalMembers').textContent = '500+'; // Placeholder
        
        // Update unread badge
        document.getElementById('unreadBadge').textContent = messages.unread || '';
        
        // Load recent messages
        const messagesContainer = document.getElementById('recentMessages');
        if (messages.submissions?.length) {
            messagesContainer.innerHTML = messages.submissions.slice(0, 5).map(m => `
                <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight: 600; color: var(--color-white);">${m.name}</div>
                    <div style="font-size: 13px; color: var(--color-gray-500);">${m.subject || 'No subject'}</div>
                </div>
            `).join('');
        }
        
        // Load recent activity
        const activityContainer = document.getElementById('recentActivity');
        try {
            const logs = await api('/settings/activity/logs?limit=5');
            if (logs?.length) {
                activityContainer.innerHTML = logs.map(log => `
                    <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="color: var(--color-gray-300);">${log.action} - ${log.entity_type || ''}</div>
                        <div style="font-size: 12px; color: var(--color-gray-500);">${formatDate(log.created_at)}</div>
                    </div>
                `).join('');
            }
        } catch(e) {}
        
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// ========================================
// PAGES MANAGEMENT
// ========================================
async function loadPages() {
    try {
        const pages = await api('/pages');
        const tbody = document.querySelector('#pagesTable tbody');
        
        tbody.innerHTML = pages.map(page => `
            <tr>
                <td><strong>${page.title}</strong></td>
                <td>/${page.slug}</td>
                <td>${getStatusBadge(page.is_published ? 'published' : 'draft')}</td>
                <td>${formatDate(page.updated_at)}</td>
                <td class="table-actions">
                    <button class="action-btn-edit" data-id="${page.id}">Edit</button>
                    <button class="delete action-btn-delete" data-id="${page.id}">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="empty-state">No pages found</td></tr>';
        
    } catch (error) {
        showToast('Failed to load pages', 'error');
    }
}

document.getElementById('addPageBtn')?.addEventListener('click', () => {
    openModal('Add New Page', getPageForm(), async () => {
        const form = document.getElementById('pageForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_published = form.querySelector('#pagePublished').checked;
        await api('/pages', { method: 'POST', body: JSON.stringify(data) });
        showToast('Page created successfully');
        loadPages();
    });
});

// Event Delegation for Pages
document.querySelector('#pagesTable tbody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editPage(editBtn.dataset.id);
    } else if (deleteBtn) {
        deletePage(deleteBtn.dataset.id);
    }
});

async function editPage(id) {
    const page = await api(`/pages/${id}`);
    openModal('Edit Page', getPageForm(page), async () => {
        const form = document.getElementById('pageForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_published = form.querySelector('#pagePublished').checked;
        await api(`/pages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Page updated successfully');
        loadPages();
    });
}

async function deletePage(id) {
    if (confirm('Are you sure you want to delete this page?')) {
        await api(`/pages/${id}`, { method: 'DELETE' });
        showToast('Page deleted');
        loadPages();
    }
}

function getPageForm(page = {}) {
    return `
        <form id="pageForm">
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" name="title" class="form-input" value="${page.title || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Slug</label>
                <input type="text" name="slug" class="form-input" value="${page.slug || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Content</label>
                <textarea name="content" class="form-input" rows="8">${page.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Meta Description</label>
                <textarea name="meta_description" class="form-input" rows="2">${page.meta_description || ''}</textarea>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="pagePublished" ${page.is_published ? 'checked' : ''}>
                    Publish Page
                </label>
            </div>
        </form>
    `;
}

// ========================================
// BLOG MANAGEMENT
// ========================================
async function loadBlog() {
    try {
        const { posts } = await api('/blog');
        const tbody = document.querySelector('#blogTable tbody');
        
        tbody.innerHTML = posts.map(post => `
            <tr>
                <td><strong>${post.title}</strong></td>
                <td>${post.category || '-'}</td>
                <td>${getStatusBadge(post.status)}</td>
                <td>${formatDate(post.publish_date || post.created_at)}</td>
                <td class="table-actions">
                    <button class="action-btn-edit" data-id="${post.id}">Edit</button>
                    <button class="delete action-btn-delete" data-id="${post.id}">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="empty-state">No posts found</td></tr>';
        
    } catch (error) {
        showToast('Failed to load posts', 'error');
    }
}

document.getElementById('addPostBtn')?.addEventListener('click', () => {
    openModal('New Blog Post', getPostForm(), async () => {
        const form = document.getElementById('postForm');
        const data = Object.fromEntries(new FormData(form));
        await api('/blog', { method: 'POST', body: JSON.stringify(data) });
        showToast('Post created successfully');
        loadBlog();
    });
});

// Event Delegation for Blog
document.querySelector('#blogTable tbody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editPost(editBtn.dataset.id);
    } else if (deleteBtn) {
        deletePost(deleteBtn.dataset.id);
    }
});

async function editPost(id) {
    const post = await api(`/blog/${id}`);
    openModal('Edit Post', getPostForm(post), async () => {
        const form = document.getElementById('postForm');
        const data = Object.fromEntries(new FormData(form));
        await api(`/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Post updated successfully');
        loadBlog();
    });
}

async function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        await api(`/blog/${id}`, { method: 'DELETE' });
        showToast('Post deleted');
        loadBlog();
    }
}

function getPostForm(post = {}) {
    return `
        <form id="postForm">
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" name="title" class="form-input" value="${post.title || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Slug</label>
                <input type="text" name="slug" class="form-input" value="${post.slug || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Excerpt</label>
                <textarea name="excerpt" class="form-input" rows="2">${post.excerpt || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Content</label>
                <textarea name="content" class="form-input" rows="10">${post.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <input type="text" name="category" class="form-input" value="${post.category || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select name="status" class="form-input">
                    <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>Draft</option>
                    <option value="published" ${post.status === 'published' ? 'selected' : ''}>Published</option>
                </select>
            </div>
        </form>
    `;
}

// ========================================
// MEDIA LIBRARY
// ========================================
async function loadMedia() {
    try {
        const media = await api('/media');
        const grid = document.getElementById('mediaGrid');
        
        grid.innerHTML = media.map(item => `
            <div class="media-item" data-id="${item.id}">
                <img src="${item.file_path}" alt="${item.alt_text || item.original_name}">
                <div class="media-item-overlay">
                    <button class="btn btn-sm btn-danger action-btn-delete" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No media files. Upload some!</p>';
        
    } catch (error) {
        showToast('Failed to load media', 'error');
    }
}

const mediaFileInput = document.getElementById('mediaFileInput');
document.getElementById('uploadMediaBtn')?.addEventListener('click', () => mediaFileInput.click());

mediaFileInput?.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    
    try {
        await apiUpload('/media', formData);
        showToast('Files uploaded successfully');
        loadMedia();
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    }
    
    mediaFileInput.value = '';
});

// Event Delegation for Media
document.getElementById('mediaGrid').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.action-btn-delete');
    const mediaItem = e.target.closest('.media-item');

    if (deleteBtn) {
        e.stopPropagation();
        deleteMedia(deleteBtn.dataset.id);
    } else if (mediaItem) {
        // showMediaDetails(mediaItem.dataset.id); // Assuming this function exists or will be implemented
    }
});

async function deleteMedia(id) {
    if (confirm('Delete this file?')) {
        await api(`/media/${id}`, { method: 'DELETE' });
        showToast('File deleted');
        loadMedia();
    }
}

// ========================================
// TRAINERS MANAGEMENT
// ========================================
async function loadTrainers() {
    try {
        const trainers = await api('/trainers');
        const grid = document.getElementById('trainersGrid');
        
        grid.innerHTML = trainers.map(t => `
            <div class="form-card">
                <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--color-surface-light); display: flex; align-items: center; justify-content: center; font-size: 24px;">
                        ${t.photo ? `<img src="${t.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : '💪'}
                    </div>
                    <div>
                        <h4 style="color: var(--color-white);">${t.name}</h4>
                        <p style="color: var(--color-primary); font-size: 13px;">${t.specialty || 'Trainer'}</p>
                    </div>
                </div>
                <p style="color: var(--color-gray-400); font-size: 13px; margin-bottom: 16px;">${t.bio || 'No bio available'}</p>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary action-btn-edit" data-id="${t.id}">Edit</button>
                    <button class="btn btn-sm btn-danger action-btn-delete" data-id="${t.id}">Delete</button>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No trainers added yet</p>';
        
    } catch (error) {
        showToast('Failed to load trainers', 'error');
    }
}

document.getElementById('addTrainerBtn')?.addEventListener('click', () => {
    openModal('Add Trainer', getTrainerForm(), async () => {
        const form = document.getElementById('trainerForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_active = form.querySelector('#trainerActive').checked;
        await api('/trainers', { method: 'POST', body: JSON.stringify(data) });
        showToast('Trainer added successfully');
        loadTrainers();
    });
});

// Event Delegation for Trainers
document.getElementById('trainersGrid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editTrainer(editBtn.dataset.id);
    } else if (deleteBtn) {
        deleteTrainer(deleteBtn.dataset.id);
    }
});

async function editTrainer(id) {
    const trainer = await api(`/trainers/${id}`);
    openModal('Edit Trainer', getTrainerForm(trainer), async () => {
        const form = document.getElementById('trainerForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_active = form.querySelector('#trainerActive').checked;
        await api(`/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Trainer updated successfully');
        loadTrainers();
    });
}

async function deleteTrainer(id) {
    if (confirm('Delete this trainer?')) {
        await api(`/trainers/${id}`, { method: 'DELETE' });
        showToast('Trainer deleted');
        loadTrainers();
    }
}

function getTrainerForm(trainer = {}) {
    return `
        <form id="trainerForm">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" name="name" class="form-input" value="${trainer.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Specialty</label>
                <input type="text" name="specialty" class="form-input" value="${trainer.specialty || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea name="bio" class="form-input" rows="3">${trainer.bio || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Photo URL</label>
                <input type="text" name="photo" class="form-input" value="${trainer.photo || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" value="${trainer.email || ''}">
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="trainerActive" ${trainer.is_active !== 0 ? 'checked' : ''}>
                    Active
                </label>
            </div>
        </form>
    `;
}

// ========================================
// CLASSES MANAGEMENT
// ========================================
async function loadClasses() {
    try {
        const classes = await api('/classes');
        const tbody = document.querySelector('#classesTable tbody');
        
        tbody.innerHTML = classes.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.trainer_name || '-'}</td>
                <td>${c.schedule || '-'}</td>
                <td>NPR ${c.price || 0}</td>
                <td>${getStatusBadge(c.is_active ? 'active' : 'inactive')}</td>
                <td class="table-actions">
                    <button class="action-btn-edit" data-id="${c.id}">Edit</button>
                    <button class="delete action-btn-delete" data-id="${c.id}">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty-state">No classes found</td></tr>';
        
    } catch (error) {
        showToast('Failed to load classes', 'error');
    }
}

document.getElementById('addClassBtn')?.addEventListener('click', async () => {
    const trainers = await api('/trainers');
    openModal('Add Class', getClassForm({}, trainers), async () => {
        const form = document.getElementById('classForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_active = form.querySelector('#classActive').checked;
        await api('/classes', { method: 'POST', body: JSON.stringify(data) });
        showToast('Class added successfully');
        loadClasses();
    });
});

// Event Delegation for Classes
document.querySelector('#classesTable tbody').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editClass(editBtn.dataset.id);
    } else if (deleteBtn) {
        deleteClass(deleteBtn.dataset.id);
    }
});

async function editClass(id) {
    const [classData, trainers] = await Promise.all([
        api(`/classes/${id}`),
        api('/trainers')
    ]);
    openModal('Edit Class', getClassForm(classData, trainers), async () => {
        const form = document.getElementById('classForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_active = form.querySelector('#classActive').checked;
        await api(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Class updated successfully');
        loadClasses();
    });
}

async function deleteClass(id) {
    if (confirm('Delete this class?')) {
        await api(`/classes/${id}`, { method: 'DELETE' });
        showToast('Class deleted');
        loadClasses();
    }
}

function getClassForm(classData = {}, trainers = []) {
    return `
        <form id="classForm">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" name="name" class="form-input" value="${classData.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea name="description" class="form-input" rows="3">${classData.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Trainer</label>
                <select name="trainer_id" class="form-input">
                    <option value="">Select Trainer</option>
                    ${trainers.map(t => `<option value="${t.id}" ${classData.trainer_id == t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Schedule</label>
                <input type="text" name="schedule" class="form-input" value="${classData.schedule || ''}" placeholder="Mon, Wed, Fri - 6:00 AM">
            </div>
            <div class="form-group">
                <label class="form-label">Price (NPR)</label>
                <input type="number" name="price" class="form-input" value="${classData.price || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Difficulty</label>
                <select name="difficulty" class="form-input">
                    <option value="beginner" ${classData.difficulty === 'beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="intermediate" ${classData.difficulty === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="advanced" ${classData.difficulty === 'advanced' ? 'selected' : ''}>Advanced</option>
                </select>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="classActive" ${classData.is_active !== 0 ? 'checked' : ''}>
                    Active
                </label>
            </div>
        </form>
    `;
}

// ========================================
// MEMBERSHIP MANAGEMENT
// ========================================
async function loadMembership() {
    try {
        const plans = await api('/membership');
        const grid = document.getElementById('plansGrid');
        
        grid.innerHTML = plans.map(p => `
            <div class="form-card" style="${p.is_featured ? 'border: 2px solid var(--color-primary);' : ''}">
                ${p.is_featured ? '<span style="background: var(--color-primary); color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; position: absolute; top: -10px; right: 16px;">POPULAR</span>' : ''}
                <h4 style="color: var(--color-white); margin-bottom: 8px;">${p.name}</h4>
                <div style="font-size: 28px; font-weight: 700; color: var(--color-primary); margin-bottom: 8px;">
                    NPR ${p.price.toLocaleString()}<span style="font-size: 14px; color: var(--color-gray-500);">/${p.billing_period}</span>
                </div>
                <p style="color: var(--color-gray-400); font-size: 13px; margin-bottom: 16px;">${p.description || ''}</p>
                <ul style="margin-bottom: 16px;">
                    ${(p.features || []).map(f => `<li style="color: var(--color-gray-300); padding: 4px 0; font-size: 13px;">✓ ${f}</li>`).join('')}
                </ul>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary action-btn-edit" data-id="${p.id}">Edit</button>
                    <button class="btn btn-sm btn-danger action-btn-delete" data-id="${p.id}">Delete</button>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No membership plans</p>';
        
        // Load inquiries
        try {
            const { inquiries } = await api('/membership/inquiries/all');
            const tbody = document.querySelector('#inquiriesTable tbody');
            tbody.innerHTML = inquiries?.map(i => `
                <tr>
                    <td>${i.name}</td>
                    <td>${i.email}</td>
                    <td>${i.plan_name || '-'}</td>
                    <td>${formatDate(i.created_at)}</td>
                    <td>${getStatusBadge(i.status)}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="empty-state">No inquiries</td></tr>';
        } catch(e) {}
        
    } catch (error) {
        showToast('Failed to load membership plans', 'error');
    }
}

document.getElementById('addPlanBtn')?.addEventListener('click', () => {
    openModal('Add Membership Plan', getPlanForm(), async () => {
        const form = document.getElementById('planForm');
        const data = Object.fromEntries(new FormData(form));
        data.features = data.features.split('\n').filter(f => f.trim());
        data.is_featured = form.querySelector('#planFeatured').checked;
        await api('/membership', { method: 'POST', body: JSON.stringify(data) });
        showToast('Plan added successfully');
        loadMembership();
    });
});

// Event Delegation for Membership Plans
document.getElementById('plansGrid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editPlan(editBtn.dataset.id);
    } else if (deleteBtn) {
        deletePlan(deleteBtn.dataset.id);
    }
});

async function editPlan(id) {
    const plan = await api(`/membership/${id}`);
    openModal('Edit Plan', getPlanForm(plan), async () => {
        const form = document.getElementById('planForm');
        const data = Object.fromEntries(new FormData(form));
        data.features = data.features.split('\n').filter(f => f.trim());
        data.is_featured = form.querySelector('#planFeatured').checked;
        await api(`/membership/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Plan updated successfully');
        loadMembership();
    });
}

async function deletePlan(id) {
    if (confirm('Delete this plan?')) {
        await api(`/membership/${id}`, { method: 'DELETE' });
        showToast('Plan deleted');
        loadMembership();
    }
}

function getPlanForm(plan = {}) {
    const features = Array.isArray(plan.features) ? plan.features.join('\n') : '';
    return `
        <form id="planForm">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" name="name" class="form-input" value="${plan.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Price (NPR)</label>
                <input type="number" name="price" class="form-input" value="${plan.price || 0}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Billing Period</label>
                <select name="billing_period" class="form-input">
                    <option value="month" ${plan.billing_period === 'month' ? 'selected' : ''}>Monthly</option>
                    <option value="quarter" ${plan.billing_period === 'quarter' ? 'selected' : ''}>Quarterly</option>
                    <option value="year" ${plan.billing_period === 'year' ? 'selected' : ''}>Yearly</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" name="description" class="form-input" value="${plan.description || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Features (one per line)</label>
                <textarea name="features" class="form-input" rows="5">${features}</textarea>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="planFeatured" ${plan.is_featured ? 'checked' : ''}>
                    Featured Plan
                </label>
            </div>
        </form>
    `;
}

// ========================================
// TESTIMONIALS MANAGEMENT
// ========================================
async function loadTestimonials() {
    try {
        const testimonials = await api('/testimonials');
        const grid = document.getElementById('testimonialsGrid');
        
        grid.innerHTML = testimonials.map(t => `
            <div class="form-card">
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--color-surface-light); overflow: hidden;">
                        ${t.client_photo ? `<img src="${t.client_photo}" style="width: 100%; height: 100%; object-fit: cover;">` : '👤'}
                    </div>
                    <div>
                        <div style="color: var(--color-white); font-weight: 600;">${t.client_name}</div>
                        <div style="color: var(--color-gray-500); font-size: 12px;">${t.client_title || 'Member'}</div>
                    </div>
                </div>
                <p style="color: var(--color-gray-300); font-size: 14px; font-style: italic; margin-bottom: 12px;">"${t.content}"</p>
                <div style="color: var(--color-accent);">${'⭐'.repeat(t.rating || 5)}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                    ${getStatusBadge(t.is_approved ? 'active' : 'pending')}
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary action-btn-edit" data-id="${t.id}">Edit</button>
                        <button class="btn btn-sm btn-danger action-btn-delete" data-id="${t.id}">Delete</button>
                    </div>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No testimonials yet</p>';
        
    } catch (error) {
        showToast('Failed to load testimonials', 'error');
    }
}

document.getElementById('addTestimonialBtn')?.addEventListener('click', () => {
    openModal('Add Testimonial', getTestimonialForm(), async () => {
        const form = document.getElementById('testimonialForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_approved = form.querySelector('#testimonialApproved').checked;
        await api('/testimonials', { method: 'POST', body: JSON.stringify(data) });
        showToast('Testimonial added');
        loadTestimonials();
    });
});

// Event Delegation for Testimonials
document.getElementById('testimonialsGrid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editTestimonial(editBtn.dataset.id);
    } else if (deleteBtn) {
        deleteTestimonial(deleteBtn.dataset.id);
    }
});

async function editTestimonial(id) {
    const testimonial = await api(`/testimonials/${id}`);
    openModal('Edit Testimonial', getTestimonialForm(testimonial), async () => {
        const form = document.getElementById('testimonialForm');
        const data = Object.fromEntries(new FormData(form));
        data.is_approved = form.querySelector('#testimonialApproved').checked;
        await api(`/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Testimonial updated');
        loadTestimonials();
    });
}

async function deleteTestimonial(id) {
    if (confirm('Delete this testimonial?')) {
        await api(`/testimonials/${id}`, { method: 'DELETE' });
        showToast('Testimonial deleted');
        loadTestimonials();
    }
}

function getTestimonialForm(t = {}) {
    return `
        <form id="testimonialForm">
            <div class="form-group">
                <label class="form-label">Client Name</label>
                <input type="text" name="client_name" class="form-input" value="${t.client_name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Title/Role</label>
                <input type="text" name="client_title" class="form-input" value="${t.client_title || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Photo URL</label>
                <input type="text" name="client_photo" class="form-input" value="${t.client_photo || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Testimonial</label>
                <textarea name="content" class="form-input" rows="4" required>${t.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Rating (1-5)</label>
                <input type="number" name="rating" class="form-input" min="1" max="5" value="${t.rating || 5}">
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="testimonialApproved" ${t.is_approved ? 'checked' : ''}>
                    Approved
                </label>
            </div>
        </form>
    `;
}

// ========================================
// GALLERY MANAGEMENT
// ========================================
async function loadGallery() {
    try {
        const albums = await api('/gallery/albums');
        const grid = document.getElementById('albumsGrid');
        
        grid.innerHTML = albums.map(a => `
            <div class="form-card">
                <div style="aspect-ratio: 16/9; background: var(--color-surface-light); border-radius: 8px; margin-bottom: 12px; overflow: hidden;">
                    ${a.cover_image ? `<img src="${a.cover_image}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 32px;">📷</div>'}
                </div>
                <h4 style="color: var(--color-white); margin-bottom: 4px;">${a.name}</h4>
                <p style="color: var(--color-gray-500); font-size: 13px; margin-bottom: 12px;">${a.image_count || 0} images</p>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary action-btn-edit" data-id="${a.id}">Edit</button>
                    <button class="btn btn-sm btn-danger action-btn-delete" data-id="${a.id}">Delete</button>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No albums yet</p>';
        
    } catch (error) {
        showToast('Failed to load gallery', 'error');
    }
}

document.getElementById('addAlbumBtn')?.addEventListener('click', () => {
    openModal('New Album', getAlbumForm(), async () => {
        const form = document.getElementById('albumForm');
        const data = Object.fromEntries(new FormData(form));
        await api('/gallery/albums', { method: 'POST', body: JSON.stringify(data) });
        showToast('Album created');
        loadGallery();
    });
});

// Event Delegation for Gallery
document.getElementById('albumsGrid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.action-btn-edit');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (editBtn) {
        editAlbum(editBtn.dataset.id);
    } else if (deleteBtn) {
        deleteAlbum(deleteBtn.dataset.id);
    }
});

async function editAlbum(id) {
    const album = await api(`/gallery/albums/${id}`);
    openModal('Edit Album', getAlbumForm(album), async () => {
        const form = document.getElementById('albumForm');
        const data = Object.fromEntries(new FormData(form));
        await api(`/gallery/albums/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Album updated');
        loadGallery();
    });
}

async function deleteAlbum(id) {
    if (confirm('Delete this album and all its images?')) {
        await api(`/gallery/albums/${id}`, { method: 'DELETE' });
        showToast('Album deleted');
        loadGallery();
    }
}

function getAlbumForm(album = {}) {
    return `
        <form id="albumForm">
            <div class="form-group">
                <label class="form-label">Album Name</label>
                <input type="text" name="name" class="form-input" value="${album.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea name="description" class="form-input" rows="3">${album.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Cover Image URL</label>
                <input type="text" name="cover_image" class="form-input" value="${album.cover_image || ''}">
            </div>
        </form>
    `;
}

// ========================================
// MESSAGES MANAGEMENT
// ========================================
async function loadMessages() {
    try {
        const { submissions } = await api('/contact/submissions');
        const tbody = document.querySelector('#messagesTable tbody');
        
        tbody.innerHTML = submissions.map(m => `
            <tr>
                <td>${m.name}</td>
                <td>${m.email}</td>
                <td>${m.subject || '-'}</td>
                <td>${formatDate(m.created_at)}</td>
                <td>${getStatusBadge(m.is_read ? 'read' : 'unread')}</td>
                <td class="table-actions">
                    <button class="action-btn-view" data-id="${m.id}">View</button>
                    <button class="delete action-btn-delete" data-id="${m.id}">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="empty-state">No messages</td></tr>';
        
    } catch (error) {
        console.error('Load messages error:', error);
        showToast(`Failed to load messages: ${error.message}`, 'error');
    }
}

// Event Delegation for Messages
document.querySelector('#messagesTable tbody').addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.action-btn-view');
    const deleteBtn = e.target.closest('.action-btn-delete');

    if (viewBtn) {
        viewMessage(viewBtn.dataset.id);
    } else if (deleteBtn) {
        deleteMessage(deleteBtn.dataset.id);
    }
});

async function viewMessage(id) {
    const msg = await api(`/contact/submissions/${id}`);
    await api(`/contact/submissions/${id}/read`, { method: 'PUT' });
    
    openModal('Message Details', `
        <div style="margin-bottom: 16px;">
            <strong style="color: var(--color-gray-400);">From:</strong>
            <p style="color: var(--color-white);">${msg.name} (${msg.email})</p>
        </div>
        <div style="margin-bottom: 16px;">
            <strong style="color: var(--color-gray-400);">Phone:</strong>
            <p style="color: var(--color-white);">${msg.phone || 'Not provided'}</p>
        </div>
        <div style="margin-bottom: 16px;">
            <strong style="color: var(--color-gray-400);">Subject:</strong>
            <p style="color: var(--color-white);">${msg.subject || 'No subject'}</p>
        </div>
        <div>
            <strong style="color: var(--color-gray-400);">Message:</strong>
            <p style="color: var(--color-white); white-space: pre-wrap;">${msg.message}</p>
        </div>
    `, () => {
        loadMessages();
    }, 'Close');
}

async function deleteMessage(id) {
    if (confirm('Delete this message?')) {
        await api(`/contact/submissions/${id}`, { method: 'DELETE' });
        showToast('Message deleted');
        loadMessages();
    }
}

// ========================================
// DESIGN CUSTOMIZATION
// ========================================
async function loadDesign() {
    try {
        const settings = await api('/settings');
        
        document.getElementById('heroTitle').value = settings.hero_title || '';
        document.getElementById('heroSubtitle').value = settings.hero_subtitle || '';
        document.getElementById('heroCta').value = settings.hero_cta_text || '';
        document.getElementById('primaryColor').value = settings.primary_color || '#ff4d4d';
        document.getElementById('secondaryColor').value = settings.secondary_color || '#1a1a2e';
        document.getElementById('accentColor').value = settings.accent_color || '#f9d342';
        
    } catch (error) {
        console.error('Failed to load design settings:', error);
    }
}

document.getElementById('saveDesignBtn')?.addEventListener('click', async () => {
    try {
        const data = {
            hero_title: document.getElementById('heroTitle').value,
            hero_subtitle: document.getElementById('heroSubtitle').value,
            hero_cta_text: document.getElementById('heroCta').value,
            primary_color: document.getElementById('primaryColor').value,
            secondary_color: document.getElementById('secondaryColor').value,
            accent_color: document.getElementById('accentColor').value
        };
        
        await api('/settings', { method: 'PUT', body: JSON.stringify(data) });
        showToast('Design settings saved');
        
    } catch (error) {
        showToast('Failed to save: ' + error.message, 'error');
    }
});

// ========================================
// SITE SETTINGS
// ========================================
async function loadSettings() {
    try {
        const settings = await api('/settings');
        
        document.getElementById('siteTitle').value = settings.site_title || '';
        document.getElementById('siteTagline').value = settings.site_tagline || '';
        document.getElementById('siteDescription').value = settings.site_description || '';
        document.getElementById('contactEmail').value = settings.contact_email || '';
        document.getElementById('contactPhone').value = settings.contact_phone || '';
        document.getElementById('contactAddress').value = settings.contact_address || '';
        document.getElementById('openingHours').value = settings.opening_hours || '';
        document.getElementById('socialFacebook').value = settings.social_facebook || '';
        document.getElementById('socialInstagram').value = settings.social_instagram || '';
        document.getElementById('socialYoutube').value = settings.social_youtube || '';
        
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    try {
        const data = {
            site_title: document.getElementById('siteTitle').value,
            site_tagline: document.getElementById('siteTagline').value,
            site_description: document.getElementById('siteDescription').value,
            contact_email: document.getElementById('contactEmail').value,
            contact_phone: document.getElementById('contactPhone').value,
            contact_address: document.getElementById('contactAddress').value,
            opening_hours: document.getElementById('openingHours').value,
            social_facebook: document.getElementById('socialFacebook').value,
            social_instagram: document.getElementById('socialInstagram').value,
            social_youtube: document.getElementById('socialYoutube').value
        };
        
        await api('/settings', { method: 'PUT', body: JSON.stringify(data) });
        showToast('Settings saved successfully');
        
    } catch (error) {
        showToast('Failed to save: ' + error.message, 'error');
    }
});

// ========================================
// USER & LOGOUT
// ========================================
if (currentUser) {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role;
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await api('/auth/logout', { method: 'POST' });
    } catch (e) {}
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/';
});

// ========================================
// INITIALIZATION
// ========================================
const initialSection = window.location.hash.slice(1) || 'dashboard';
showSection(initialSection);

// Make functions globally available
window.editPage = editPage;
window.deletePage = deletePage;
window.editPost = editPost;
window.deletePost = deletePost;
window.deleteMedia = deleteMedia;
window.editTrainer = editTrainer;
window.deleteTrainer = deleteTrainer;
window.editClass = editClass;
window.deleteClass = deleteClass;
window.editPlan = editPlan;
window.deletePlan = deletePlan;
window.editTestimonial = editTestimonial;
window.deleteTestimonial = deleteTestimonial;
window.editAlbum = editAlbum;
window.deleteAlbum = deleteAlbum;
window.viewMessage = viewMessage;
window.deleteMessage = deleteMessage;

console.log('🔧 Admin Dashboard Loaded');
