/**
 * PowerHouse Gym Chitwan - Main JavaScript
 * Core functionality and utilities
 */

// ========================================
// GLOBAL STATE
// ========================================
const App = {
    API_URL: '/api',
    isLoggedIn: false,
    user: null,
    settings: {}
};

// ========================================
// UTILITIES
// ========================================

/**
 * Debounce function to limit rapid calls
 */
function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for scroll events
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format currency for Nepal
 */
function formatCurrency(amount) {
    return `NPR ${amount.toLocaleString('en-NP')}`;
}

/**
 * Format date
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    try {
        const response = await fetch(`${App.API_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========================================
// NAVIGATION
// ========================================

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll handler for navbar background
    const handleScroll = throttle(() => {
        if (window.scrollY > 50) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    }, 50);

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // Mobile menu toggle
    navToggle?.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu?.classList.toggle('active');
        navOverlay?.classList.toggle('active');
        document.body.style.overflow = navMenu?.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on overlay click
    navOverlay?.addEventListener('click', () => {
        navToggle?.classList.remove('active');
        navMenu?.classList.remove('active');
        navOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle?.classList.remove('active');
            navMenu?.classList.remove('active');
            navOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Active link based on current page
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === '/')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ========================================
// SMOOTH SCROLL
// ========================================

/**
 * Initialize smooth scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========================================
// COUNTER ANIMATION
// ========================================

/**
 * Animate counters when visible
 */
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-count'));
                animateCounter(counter, target);
                counterObserver.unobserve(counter);
            }
        });
    }, observerOptions);

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

/**
 * Animate single counter
 */
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50; // 50 steps
    const duration = 2000; // 2 seconds
    const stepTime = duration / 50;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, stepTime);
}

// ========================================
// FORM HANDLING
// ========================================

/**
 * Initialize form handling
 */
function initForms() {
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }

    // Membership inquiry form
    const inquiryForm = document.getElementById('inquiryForm');
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', handleInquirySubmit);
    }
}

/**
 * Handle contact form submission
 */
async function handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const result = await fetchAPI('/contact', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showNotification('Message sent successfully! We will get back to you soon.', 'success');
        form.reset();
    } catch (error) {
        showNotification(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Handle newsletter subscription
 */
async function handleNewsletterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;

    try {
        // For now, just show success (implement backend later)
        showNotification('Thank you for subscribing to our newsletter!', 'success');
        form.reset();
    } catch (error) {
        showNotification('Failed to subscribe. Please try again.', 'error');
    }
}

/**
 * Handle membership inquiry
 */
async function handleInquirySubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const result = await fetchAPI('/membership/inquiry', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showNotification('Inquiry submitted! Our team will contact you soon.', 'success');
        form.reset();
    } catch (error) {
        showNotification(error.message || 'Failed to submit inquiry. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ========================================
// NOTIFICATIONS
// ========================================

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add styles if not present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                background: var(--color-dark-surface);
                color: var(--color-white);
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 9999;
                animation: slideIn 0.3s ease;
            }
            .notification-success { border-left: 4px solid var(--color-success); }
            .notification-error { border-left: 4px solid var(--color-error); }
            .notification-info { border-left: 4px solid var(--color-info); }
            .notification-close {
                background: none;
                border: none;
                color: var(--color-gray-400);
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .notification-close:hover { color: var(--color-white); }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ========================================
// DATA LOADING
// ========================================

/**
 * Load site settings
 */
async function loadSettings() {
    try {
        App.settings = await fetchAPI('/settings');
        applySettings();
    } catch (error) {
        console.log('Using default settings');
    }
}

/**
 * Apply loaded settings to the page
 */
function applySettings() {
    const s = App.settings;

    // 1. Site Identity
    if (s.site_title) {
        document.title = s.site_title + (s.site_tagline ? ` | ${s.site_tagline}` : '');
        // Update logo text if needed, though usually static
    }

    // 2. Theme Colors
    if (s.primary_color) document.documentElement.style.setProperty('--color-primary', s.primary_color);
    if (s.secondary_color) document.documentElement.style.setProperty('--color-dark', s.secondary_color);
    if (s.accent_color) document.documentElement.style.setProperty('--color-accent', s.accent_color);

    // 3. Hero Section
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-buttons .btn-primary');

    if (heroTitle && s.hero_title) {
        // Preserving the span if it exists in the input, or just simple text
        // If the user input has newlines, we can try to split it like before
        const parts = s.hero_title.split('\n');
        heroTitle.innerHTML = parts[0] + (parts[1] ? `<span>${parts[1]}</span>` : '');
    }
    if (heroSubtitle && s.hero_subtitle) heroSubtitle.textContent = s.hero_subtitle;
    if (heroCta && s.hero_cta_text) heroCta.textContent = s.hero_cta_text;

    // 4. Contact Info (Footer)
    // Selectors based on index in .footer-contact-item
    const contactItems = document.querySelectorAll('.footer-contact-item span');
    if (contactItems.length >= 4) {
        if (s.contact_address) contactItems[0].textContent = s.contact_address;
        if (s.contact_phone) contactItems[1].textContent = s.contact_phone;
        if (s.contact_email) contactItems[2].textContent = s.contact_email;
        if (s.opening_hours) contactItems[3].innerHTML = s.opening_hours.replace(/\n/g, '<br>');
    }

    // 5. Social Links
    const socialLinks = {
        'Facebook': s.social_facebook,
        'Instagram': s.social_instagram,
        'YouTube': s.social_youtube
    };

    Object.entries(socialLinks).forEach(([platform, url]) => {
        const link = document.querySelector(`.footer-social a[aria-label="${platform}"]`);
        if (link) {
            if (url) {
                link.href = url;
                link.style.display = 'inline-flex';
            } else {
                link.style.display = 'none';
            }
        }
    });
}

/**
 * Load membership plans
 */
async function loadMembershipPlans() {
    const container = document.getElementById('pricing-cards');
    if (!container) return;

    try {
        const plans = await fetchAPI('/membership');
        if (plans.length > 0) {
            renderPricingCards(container, plans);
        }
    } catch (error) {
        console.log('Using static pricing cards');
    }
}

/**
 * Render pricing cards
 */
function renderPricingCards(container, plans) {
    container.innerHTML = plans.map(plan => `
        <div class="pricing-card ${plan.is_featured ? 'featured' : ''} fade-in visible">
            <h3 class="pricing-name">${plan.name}</h3>
            <div class="pricing-price">NPR ${plan.price.toLocaleString()}<span>/${plan.billing_period}</span></div>
            <p class="pricing-period">Billed ${plan.billing_period}ly</p>
            <ul class="pricing-features">
                ${plan.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <a href="/membership.html?plan=${plan.id}" class="btn ${plan.is_featured ? 'btn-primary' : 'btn-outline'} w-full">Get Started</a>
        </div>
    `).join('');
}

/**
 * Load testimonials
 */
async function loadTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    try {
        const testimonials = await fetchAPI('/testimonials');
        if (testimonials.length > 0) {
            renderTestimonials(container, testimonials);
        }
    } catch (error) {
        console.log('Using static testimonials');
    }
}

// ========================================
// LAZY LOADING IMAGES
// ========================================

/**
 * Initialize lazy loading for images
 */
function initLazyLoad() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        return;
    }

    // Fallback for older browsers
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize all components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Core functionality
    initNavigation();
    initSmoothScroll();
    initCounters();
    initForms();
    initLazyLoad();

    // Load dynamic content
    loadSettings();
    loadMembershipPlans();
    loadTestimonials();

    console.log('🏋️ PowerHouse Gym Chitwan - Website Loaded');
});

// Export for global use
window.App = App;
window.fetchAPI = fetchAPI;
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
