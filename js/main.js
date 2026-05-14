// Sticky nav
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Smooth scroll with nav offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
    });
});

// Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.step, .niche-card, .benefit').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
});


// Demo hint clicks — fill input and send
document.querySelectorAll('.demo-hints li').forEach(hint => {
    hint.addEventListener('click', () => {
        const raw = hint.textContent;
        const match = raw.match(/"([^"]+)"/);
        const text = match ? match[1] : raw.replace('💬 ', '').trim();
        const input = document.getElementById('chatInput');
        if (input && text) {
            input.value = text;
            input.focus();
            document.getElementById('chatSend').click();
        }
    });
});
