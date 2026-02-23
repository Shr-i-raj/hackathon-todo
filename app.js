// ===== Taskflow - Smart Todo App =====

(function () {
    'use strict';

    // ===== State =====
    let todos = JSON.parse(localStorage.getItem('taskflow-todos')) || [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedCategory = 'personal';
    let selectedPriority = 'low';

    // ===== DOM Elements =====
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const filterTabs = document.getElementById('filter-tabs');
    const footerActions = document.getElementById('footer-actions');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const categorySelector = document.getElementById('category-selector');
    const prioritySelector = document.getElementById('priority-selector');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const ctx = confettiCanvas.getContext('2d');

    // Stat elements
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statCompleted = document.getElementById('stat-completed');
    const progressRing = document.getElementById('progress-ring');
    const progressText = document.getElementById('progress-text');

    // ===== Category Emojis Map =====
    const categoryEmojis = {
        personal: '🏠',
        work: '💼',
        study: '📚',
        other: '🔖'
    };

    // ===== Initialize =====
    function init() {
        render();
        bindEvents();
        resizeCanvas();
    }

    // ===== Event Bindings =====
    function bindEvents() {
        addBtn.addEventListener('click', addTodo);
        todoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            render();
        });

        filterTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tab')) {
                filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                render();
            }
        });

        categorySelector.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill');
            if (pill) {
                categorySelector.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedCategory = pill.dataset.value;
            }
        });

        prioritySelector.addEventListener('click', (e) => {
            const pill = e.target.closest('.pill');
            if (pill) {
                prioritySelector.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedPriority = pill.dataset.value;
            }
        });

        clearCompletedBtn.addEventListener('click', clearCompleted);

        window.addEventListener('resize', resizeCanvas);
    }

    // ===== Add Todo =====
    function addTodo() {
        const text = todoInput.value.trim();
        if (!text) {
            todoInput.classList.add('shake');
            setTimeout(() => todoInput.classList.remove('shake'), 400);
            return;
        }

        const todo = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            text,
            category: selectedCategory,
            priority: selectedPriority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        todos.unshift(todo);
        save();
        todoInput.value = '';
        todoInput.focus();
        render();
    }

    // ===== Toggle Complete =====
    function toggleTodo(id) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            save();

            if (todo.completed) {
                launchConfetti();
            }

            // Animate the specific item
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) {
                el.classList.toggle('completed', todo.completed);
                const checkbox = el.querySelector('.todo-checkbox');
                checkbox.classList.toggle('checked', todo.completed);
            }

            updateStats();
        }
    }

    // ===== Delete Todo =====
    function deleteTodo(id) {
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) {
            el.classList.add('removing');
            setTimeout(() => {
                todos = todos.filter(t => t.id !== id);
                save();
                render();
            }, 300);
        }
    }

    // ===== Edit Todo =====
    function startEdit(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        const el = document.querySelector(`[data-id="${id}"]`);
        const textEl = el.querySelector('.todo-text');

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'todo-edit-input';
        input.value = todo.text;

        textEl.replaceWith(input);
        input.focus();
        input.select();

        const finishEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== todo.text) {
                todo.text = newText;
                save();
            }
            render();
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.value = todo.text;
                input.blur();
            }
        });
    }

    // ===== Clear Completed =====
    function clearCompleted() {
        const completedEls = document.querySelectorAll('.todo-item.completed');
        completedEls.forEach(el => el.classList.add('removing'));

        setTimeout(() => {
            todos = todos.filter(t => !t.completed);
            save();
            render();
        }, 300);
    }

    // ===== Filter & Search =====
    function getFilteredTodos() {
        return todos.filter(todo => {
            const matchesFilter =
                currentFilter === 'all' ||
                (currentFilter === 'active' && !todo.completed) ||
                (currentFilter === 'completed' && todo.completed);

            const matchesSearch = !searchQuery ||
                todo.text.toLowerCase().includes(searchQuery) ||
                todo.category.toLowerCase().includes(searchQuery);

            return matchesFilter && matchesSearch;
        });
    }

    // ===== Render =====
    function render() {
        const filtered = getFilteredTodos();

        // Clear list (except empty state structure)
        todoList.innerHTML = '';

        if (filtered.length === 0) {
            const noResults = searchQuery || currentFilter !== 'all';
            todoList.innerHTML = `
                <div class="empty-state" id="empty-state">
                    <div class="empty-icon">${noResults ? '🔍' : '📝'}</div>
                    <h3>${noResults ? 'No matching tasks' : 'No tasks yet'}</h3>
                    <p>${noResults ? 'Try adjusting your search or filter.' : 'Add your first task above to get started!'}</p>
                </div>
            `;
        } else {
            filtered.forEach((todo, index) => {
                const item = createTodoElement(todo, index);
                todoList.appendChild(item);
            });
        }

        updateStats();

        // Show/hide footer
        const hasCompleted = todos.some(t => t.completed);
        footerActions.style.display = hasCompleted ? 'block' : 'none';
    }

    // ===== Create Todo Element =====
    function createTodoElement(todo, index) {
        const div = document.createElement('div');
        div.className = `todo-item${todo.completed ? ' completed' : ''}`;
        div.dataset.id = todo.id;
        div.style.animationDelay = `${index * 0.04}s`;

        const timeAgo = getTimeAgo(todo.createdAt);

        div.innerHTML = `
            <div class="priority-indicator ${todo.priority}"></div>
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <div class="todo-content">
                <div class="todo-text">${escapeHTML(todo.text)}</div>
                <div class="todo-meta">
                    <span class="todo-category">${categoryEmojis[todo.category] || '🔖'} ${capitalize(todo.category)}</span>
                    <span class="todo-time">${timeAgo}</span>
                </div>
            </div>
            <div class="todo-actions">
                <button class="action-btn edit" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="action-btn delete" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Event listeners
        div.querySelector('.todo-checkbox').addEventListener('click', () => toggleTodo(todo.id));
        div.querySelector('.action-btn.edit').addEventListener('click', () => startEdit(todo.id));
        div.querySelector('.action-btn.delete').addEventListener('click', () => deleteTodo(todo.id));

        return div;
    }

    // ===== Update Stats =====
    function updateStats() {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        animateNumber(statTotal, total);
        animateNumber(statActive, active);
        animateNumber(statCompleted, completed);

        // Progress ring
        const circumference = 2 * Math.PI * 18; // r=18
        const offset = circumference - (percent / 100) * circumference;
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `${percent}%`;
    }

    function animateNumber(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) return;
        el.textContent = target;
        el.style.transform = 'scale(1.2)';
        el.style.color = '#7c5cfc';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            el.style.color = '';
        }, 200);
    }

    // ===== Persistence =====
    function save() {
        localStorage.setItem('taskflow-todos', JSON.stringify(todos));
    }

    // ===== Utilities =====
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getTimeAgo(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ===== Confetti =====
    let confettiParticles = [];
    let confettiAnimating = false;

    function resizeCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }

    function launchConfetti() {
        const colors = ['#7c5cfc', '#ff4d6a', '#ffb84d', '#4dffb8', '#5cbbfc', '#fc5c9c'];
        for (let i = 0; i < 50; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: confettiCanvas.height + 10,
                vx: (Math.random() - 0.5) * 8,
                vy: -(Math.random() * 12 + 8),
                size: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                gravity: 0.25,
                opacity: 1,
                decay: 0.015 + Math.random() * 0.01
            });
        }
        if (!confettiAnimating) {
            confettiAnimating = true;
            animateConfetti();
        }
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        confettiParticles.forEach(p => {
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });

        confettiParticles = confettiParticles.filter(p => p.opacity > 0);

        if (confettiParticles.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiAnimating = false;
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    // ===== Start App =====
    init();
})();
