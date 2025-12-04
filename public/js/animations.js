/**
 * PowerHouse Gym Chitwan - Animations
 * Scroll animations and effects
 */

// ========================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ========================================

/**
 * Initialize scroll-triggered animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        animationObserver.observe(el);
    });
}

/**
 * Initialize staggered animations for lists
 */
function initStaggerAnimations() {
    const staggerContainers = document.querySelectorAll('[data-stagger]');
    
    staggerContainers.forEach(container => {
        const items = container.querySelectorAll('.stagger-item');
        const delay = parseInt(container.dataset.stagger) || 100;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('visible');
                        }, index * delay);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        observer.observe(container);
    });
}

// ========================================
// PARALLAX EFFECTS
// ========================================

/**
 * Initialize parallax scrolling for hero section
 */
function initParallax() {
    const hero = document.querySelector('.hero');
    const heroBg = document.querySelector('.hero-bg img');
    
    if (!hero || !heroBg) return;

    // Only enable parallax on larger screens
    if (window.innerWidth < 768) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                const heroHeight = hero.offsetHeight;
                
                if (scrolled < heroHeight) {
                    heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
                }
                
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ========================================
// CURSOR EFFECTS (Optional)
// ========================================

/**
 * Initialize custom cursor effect
 */
function initCustomCursor() {
    // Only on desktop
    if (window.innerWidth < 1024 || 'ontouchstart' in window) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
    document.body.appendChild(cursor);

    const styles = document.createElement('style');
    styles.textContent = `
        .custom-cursor {
            position: fixed;
            pointer-events: none;
            z-index: 9999;
        }
        .cursor-dot {
            position: absolute;
            width: 8px;
            height: 8px;
            background: var(--color-primary);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: transform 0.1s ease;
        }
        .cursor-ring {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 2px solid var(--color-primary);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.15s ease;
            opacity: 0.5;
        }
        .cursor-hover .cursor-ring {
            width: 60px;
            height: 60px;
            opacity: 1;
        }
        .cursor-hover .cursor-dot {
            transform: translate(-50%, -50%) scale(0.5);
        }
    `;
    document.head.appendChild(styles);

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateCursor() {
        cursorX += (mouseX - cursorX) * 0.1;
        cursorY += (mouseY - cursorY) * 0.1;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .btn');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
}

// ========================================
// TEXT ANIMATIONS
// ========================================

/**
 * Initialize typewriter effect for hero title
 */
function initTypewriter() {
    const element = document.querySelector('[data-typewriter]');
    if (!element) return;

    const text = element.dataset.typewriter;
    const speed = parseInt(element.dataset.speed) || 50;
    
    element.textContent = '';
    let i = 0;

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    // Start when element is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                type();
                observer.unobserve(entry.target);
            }
        });
    });

    observer.observe(element);
}

// ========================================
// HOVER EFFECTS
// ========================================

/**
 * Initialize tilt effect for cards
 */
function initTiltEffect() {
    const cards = document.querySelectorAll('[data-tilt]');
    
    // Only on desktop
    if (window.innerWidth < 1024) return;

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

// ========================================
// LOADING ANIMATION
// ========================================

/**
 * Initialize page loading animation
 */
function initPageLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('loaded');
            setTimeout(() => {
                loader.remove();
            }, 500);
        }, 300);
    });
}

// ========================================
// SCROLL PROGRESS
// ========================================

/**
 * Initialize scroll progress indicator
 */
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    const styles = document.createElement('style');
    styles.textContent = `
        .scroll-progress {
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
            z-index: 9999;
            transform-origin: left;
            transform: scaleX(0);
            transition: transform 0.1s linear;
        }
    `;
    document.head.appendChild(styles);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        progressBar.style.transform = `scaleX(${scrollPercent})`;
    });
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initStaggerAnimations();
    initParallax();
    initTypewriter();
    initTiltEffect();
    initPageLoader();
    initScrollProgress();
    
    // Optional: Custom cursor (can be disabled for performance)
    // initCustomCursor();

    console.log('🎨 Animations initialized');
});

// Re-initialize on window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Reinitialize parallax for proper calculation
        initParallax();
    }, 250);
});
