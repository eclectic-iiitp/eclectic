/* ════════════════════════════════════════════
   ECLECTIC — JavaScript
   Smooth scroll, sticky nav, scroll spy,
   lightbox, reveal animations
   ════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM References ──
  const nav = document.getElementById('main-nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section, .hero-section');
  const revealElements = document.querySelectorAll('.reveal');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const galleryItems = document.querySelectorAll('.gallery-item');

  let currentGalleryIndex = 0;

  // ── Smooth Scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (target) {
        var navHeight = nav.offsetHeight;
        var targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });

        // Close mobile nav if open
        if (navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          navToggle.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // ── Sticky Nav ──
  function handleNavScroll() {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  // ── Scroll Spy ──
  function handleScrollSpy() {
    var scrollPos = window.scrollY + nav.offsetHeight + 100;

    sections.forEach(function (section) {
      var sectionTop = section.offsetTop;
      var sectionHeight = section.offsetHeight;
      var sectionId = section.getAttribute('id');

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight && sectionId) {
        allNavLinks.forEach(function (link) {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + sectionId) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // ── Mobile Nav Toggle ──
  navToggle.addEventListener('click', function () {
    var isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close nav on outside click
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Scroll Reveal (IntersectionObserver) ──
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  revealElements.forEach(function (el) {
    revealObserver.observe(el);
  });

  // ── Gallery Lightbox ──
  function openLightbox(index) {
    currentGalleryIndex = index;
    var item = galleryItems[index];
    var caption = item.getAttribute('data-caption') || '';

    // For placeholder images, use the placeholder's data-label
    var placeholder = item.querySelector('.image-placeholder');
    var img = item.querySelector('img');

    if (img) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || caption;
    } else if (placeholder) {
      // Create a temporary visual for placeholder
      lightboxImg.src = '';
      lightboxImg.alt = caption;
      lightboxImg.style.display = 'none';
    }

    lightboxCaption.textContent = caption;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxImg.style.display = '';
  }

  function nextImage() {
    currentGalleryIndex = (currentGalleryIndex + 1) % galleryItems.length;
    openLightbox(currentGalleryIndex);
  }

  function prevImage() {
    currentGalleryIndex = (currentGalleryIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentGalleryIndex);
  }

  galleryItems.forEach(function (item, index) {
    item.addEventListener('click', function () {
      openLightbox(index);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', nextImage);
  if (lightboxPrev) lightboxPrev.addEventListener('click', prevImage);

  // Close lightbox on overlay click
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-overlay')) {
      closeLightbox();
    }
  });

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });

  // ── Form Submission (via links, no buttons) ──
  var joinTrigger = document.getElementById('form-submit-trigger');
  var contactTrigger = document.getElementById('contact-submit-trigger');

  if (joinTrigger) {
    joinTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      var form = document.getElementById('join-form');
      if (form.checkValidity()) {
        // In production, send form data to server
        alert('Thank you for your interest! We will reach out to you soon.');
        form.reset();
      } else {
        form.reportValidity();
      }
    });
  }

  if (contactTrigger) {
    contactTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      var form = document.getElementById('contact-form');
      if (form.checkValidity()) {
        alert('Message sent! We will get back to you shortly.');
        form.reset();
      } else {
        form.reportValidity();
      }
    });
  }

  // ── Scroll Event Listener (throttled) ──
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        handleNavScroll();
        handleScrollSpy();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Initial calls
  handleNavScroll();
  handleScrollSpy();
})();
