(function () {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  const body = document.body;
  const header = document.getElementById('site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.querySelector('.mobile-menu__close');
  const bookingDialog = document.getElementById('booking-dialog');
  const bookingForm = document.getElementById('booking-form');
  const bookingSuccess = document.querySelector('.booking-success');
  const galleryDialog = document.getElementById('gallery-lightbox');
  const galleryImage = document.querySelector('.lightbox__image');
  const galleryTitle = document.getElementById('lightbox-title');
  const galleryCount = document.getElementById('lightbox-count');
  const galleryButtons = Array.from(document.querySelectorAll('[data-gallery-src]'));
  const year = document.getElementById('current-year');
  const reviewStatus = document.getElementById('review-status');
  const pageBackground = [
    document.querySelector('.skip-link'),
    document.querySelector('.nav-shell'),
    document.getElementById('main-content'),
    document.querySelector('.footer')
  ].filter(Boolean);
  let triggerBeforeDialog = null;
  let activeGalleryIndex = 0;
  let touchStartX = 0;
  let fallbackDialog = null;
  let fallbackBackdrop = null;

  if (year) year.textContent = new Date().getFullYear();

  function setBackgroundInert(isInert) {
    pageBackground.forEach(function (element) {
      element.inert = isInert;
      if (isInert) {
        element.setAttribute('aria-hidden', 'true');
      } else {
        element.removeAttribute('aria-hidden');
      }
    });
  }

  function getFocusable(container) {
    return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab') return;
    const focusable = getFocusable(container);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setMenu(open) {
    if (!mobileMenu || !menuToggle) return;
    const wasOpen = mobileMenu.classList.contains('is-open');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.classList.toggle('menu-open', open);
    setBackgroundInert(open);
    if (open) {
      window.setTimeout(function () { if (mobileClose) mobileClose.focus(); }, 50);
    } else if (wasOpen) {
      menuToggle.focus();
    }
  }

  menuToggle && menuToggle.addEventListener('click', function () {
    setMenu(!mobileMenu.classList.contains('is-open'));
  });
  mobileClose && mobileClose.addEventListener('click', function () { setMenu(false); });
  mobileMenu && mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  mobileMenu && mobileMenu.addEventListener('keydown', function (event) {
    trapFocus(event, mobileMenu);
  });

  function cleanupFallbackDialog() {
    if (fallbackBackdrop) fallbackBackdrop.remove();
    fallbackBackdrop = null;
    fallbackDialog = null;
  }

  function finishDialogClose() {
    body.classList.remove('dialog-open');
    if (triggerBeforeDialog && triggerBeforeDialog.focus) triggerBeforeDialog.focus();
  }

  function openDialog(dialog) {
    if (!dialog) return false;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      fallbackDialog = dialog;
      fallbackBackdrop = document.createElement('div');
      fallbackBackdrop.className = 'dialog-fallback-backdrop';
      fallbackBackdrop.addEventListener('click', function () { closeDialog(dialog); });
      body.appendChild(fallbackBackdrop);
      dialog.classList.add('dialog-fallback');
      dialog.setAttribute('open', '');
    }
    body.classList.add('dialog-open');
    return true;
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (dialog.classList.contains('dialog-fallback')) {
      dialog.removeAttribute('open');
      dialog.classList.remove('dialog-fallback');
      cleanupFallbackDialog();
      finishDialogClose();
    } else {
      dialog.close();
    }
  }

  function openBooking(trigger) {
    triggerBeforeDialog = trigger || document.activeElement;
    setMenu(false);
    if (bookingForm) bookingForm.hidden = false;
    if (bookingSuccess) bookingSuccess.hidden = true;
    if (openDialog(bookingDialog)) {
      window.setTimeout(function () {
        const firstField = bookingDialog.querySelector('input');
        if (firstField) firstField.focus();
      }, 40);
    }
  }

  function closeBooking() {
    closeDialog(bookingDialog);
  }

  document.querySelectorAll('[data-open-booking]').forEach(function (button) {
    button.addEventListener('click', function () { openBooking(button); });
  });
  document.querySelector('.dialog-close') && document.querySelector('.dialog-close').addEventListener('click', closeBooking);
  document.querySelectorAll('[data-close-booking]').forEach(function (button) {
    button.addEventListener('click', closeBooking);
  });
  bookingDialog && bookingDialog.addEventListener('close', function () {
    finishDialogClose();
  });
  bookingDialog && bookingDialog.addEventListener('click', function (event) {
    if (event.target === bookingDialog) closeBooking();
  });
  bookingDialog && bookingDialog.addEventListener('keydown', function (event) {
    if (bookingDialog.classList.contains('dialog-fallback')) trapFocus(event, bookingDialog);
  });
  bookingForm && bookingForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;
    const data = new FormData(bookingForm);
    const name = data.get('name') || 'Guest';
    const checkIn = data.get('check-in') || 'Not specified';
    const checkOut = data.get('check-out') || 'Not specified';
    const note = data.get('note') || 'None';
    const message = [
      'Hello Casita Lia,',
      '',
      'I would like to enquire about a stay.',
      '',
      'Name: ' + name,
      'Email: ' + (data.get('email') || ''),
      'Check in: ' + checkIn,
      'Check out: ' + checkOut,
      'Guests: ' + (data.get('guests') || ''),
      'Note: ' + note
    ].join('\n');
    window.location.href = 'mailto:hello@casitalia.com?subject=' + encodeURIComponent('Casita Lia stay enquiry — ' + name) + '&body=' + encodeURIComponent(message);
    bookingForm.hidden = true;
    if (bookingSuccess) bookingSuccess.hidden = false;
    const responseButton = bookingSuccess && bookingSuccess.querySelector('button');
    if (responseButton) responseButton.focus();
  });

  function showGalleryImage(index) {
    if (!galleryButtons.length) return;
    activeGalleryIndex = (index + galleryButtons.length) % galleryButtons.length;
    const item = galleryButtons[activeGalleryIndex];
    galleryImage.src = item.dataset.gallerySrc;
    galleryImage.alt = item.dataset.galleryAlt || '';
    galleryTitle.textContent = item.dataset.galleryTitle || '';
    galleryCount.textContent = String(activeGalleryIndex + 1).padStart(2, '0') + ' / ' + String(galleryButtons.length).padStart(2, '0');
  }

  function openGallery(index, trigger) {
    triggerBeforeDialog = trigger || document.activeElement;
    showGalleryImage(index);
    if (openDialog(galleryDialog)) {
      window.setTimeout(function () {
        const closeButton = galleryDialog.querySelector('.lightbox__close');
        if (closeButton) closeButton.focus();
      }, 40);
    }
  }

  function closeGallery() {
    closeDialog(galleryDialog);
  }

  galleryButtons.forEach(function (button, index) {
    button.addEventListener('click', function () { openGallery(index, button); });
  });
  galleryDialog && galleryDialog.querySelector('.lightbox__close').addEventListener('click', closeGallery);
  galleryDialog && galleryDialog.querySelector('.lightbox__nav--prev').addEventListener('click', function () {
    showGalleryImage(activeGalleryIndex - 1);
  });
  galleryDialog && galleryDialog.querySelector('.lightbox__nav--next').addEventListener('click', function () {
    showGalleryImage(activeGalleryIndex + 1);
  });
  galleryDialog && galleryDialog.addEventListener('click', function (event) {
    if (event.target === galleryDialog) closeGallery();
  });
  galleryDialog && galleryDialog.addEventListener('close', function () {
    finishDialogClose();
  });
  galleryDialog && galleryDialog.addEventListener('keydown', function (event) {
    if (galleryDialog.classList.contains('dialog-fallback')) trapFocus(event, galleryDialog);
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showGalleryImage(activeGalleryIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showGalleryImage(activeGalleryIndex + 1);
    }
  });
  galleryDialog && galleryDialog.addEventListener('touchstart', function (event) {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  galleryDialog && galleryDialog.addEventListener('touchend', function (event) {
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) showGalleryImage(activeGalleryIndex + (delta < 0 ? 1 : -1));
  }, { passive: true });

  let reviewIndex = 0;
  const reviewTrack = document.querySelector('.review-track');
  const reviewDots = Array.from(document.querySelectorAll('.review-pagination span'));
  const reviewCards = Array.from(document.querySelectorAll('.review-card'));

  function showReview(nextIndex) {
    if (!reviewTrack || !reviewCards.length) return;
    reviewIndex = (nextIndex + reviewCards.length) % reviewCards.length;
    reviewTrack.style.transform = 'translateX(-' + (reviewIndex * 100) + '%)';
    reviewCards.forEach(function (card, index) {
      const isActive = index === reviewIndex;
      card.setAttribute('aria-hidden', String(!isActive));
      card.inert = !isActive;
    });
    reviewDots.forEach(function (dot, index) {
      dot.classList.toggle('is-active', index === reviewIndex);
    });
    if (reviewStatus) {
      const author = reviewCards[reviewIndex].querySelector('footer strong');
      const quote = reviewCards[reviewIndex].querySelector('blockquote');
      reviewStatus.textContent = 'Review ' + (reviewIndex + 1) + ' of ' + reviewCards.length + ': ' + (author ? author.textContent : '') + '. ' + (quote ? quote.textContent : '');
    }
  }

  document.querySelector('[data-review-prev]') && document.querySelector('[data-review-prev]').addEventListener('click', function () {
    showReview(reviewIndex - 1);
  });
  document.querySelector('[data-review-next]') && document.querySelector('[data-review-next]').addEventListener('click', function () {
    showReview(reviewIndex + 1);
  });
  showReview(0);

  const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionAllowed) {
    const revealItems = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries, observerInstance) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerInstance.unobserve(entry.target);
          }
        });
      }, { threshold: .13, rootMargin: '0px 0px -30px' });
      revealItems.forEach(function (item) { observer.observe(item); });
    } else {
      revealItems.forEach(function (item) { item.classList.add('is-visible'); });
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (item) { item.classList.add('is-visible'); });
  }

  function revealHashTarget() {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (target) target.querySelectorAll('.reveal').forEach(function (item) { item.classList.add('is-visible'); });
  }
  window.addEventListener('hashchange', revealHashTarget);
  window.setTimeout(revealHashTarget, 150);

  let ticking = false;
  function syncScroll() {
    const offset = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', offset > 24);
    if (motionAllowed) document.documentElement.style.setProperty('--scroll-y', Math.min(offset, 1000) + 'px');
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(syncScroll);
      ticking = true;
    }
  }, { passive: true });
  syncScroll();

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('is-open')) setMenu(false);
    if (event.key === 'Escape' && fallbackDialog) closeDialog(fallbackDialog);
  });
}());
