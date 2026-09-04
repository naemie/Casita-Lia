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
  const bookingCheckIn = document.getElementById('booking-check-in');
  const bookingCheckOut = document.getElementById('booking-check-out');
  const bookingGuests = document.getElementById('booking-guests');
  const bookingDuration = document.getElementById('booking-stay-duration');
  const bookingStayBadge = document.getElementById('booking-stay-badge');
  const heroBookingBar = document.getElementById('hero-booking-bar');
  const heroCheckIn = document.getElementById('hero-check-in');
  const heroCheckOut = document.getElementById('hero-check-out');
  const heroGuests = document.getElementById('hero-guests');
  const stickyBookBar = document.getElementById('sticky-book-bar');
  const backToTopBtn = document.getElementById('back-to-top');
  const toastNotice = document.getElementById('toast-notice');
  const copyAddressBtn = document.getElementById('copy-address-btn');
  const galleryDialog = document.getElementById('gallery-lightbox');
  const galleryImage = document.querySelector('.lightbox__image');
  const galleryTitle = document.getElementById('lightbox-title');
  const galleryCount = document.getElementById('lightbox-count');
  const galleryButtons = Array.from(document.querySelectorAll('[data-gallery-src]'));
  const year = document.getElementById('current-year');
  const navLinks = Array.from(document.querySelectorAll('.desktop-nav a'));
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  const amenityButtons = Array.from(document.querySelectorAll('.amenity-tag'));
  const featureCards = Array.from(document.querySelectorAll('.feature-card'));
  const spotButtons = Array.from(document.querySelectorAll('.map-spot-btn'));
  const spotTitle = document.getElementById('location-spot-title');
  const spotDist = document.getElementById('location-spot-dist');
  const pageBackground = [
    document.querySelector('.skip-link'),
    document.getElementById('site-header'),
    document.getElementById('main-content'),
    document.querySelector('.footer')
  ].filter(Boolean);
  let triggerBeforeDialog = null;
  let activeGalleryIndex = 0;
  let touchStartX = 0;
  let fallbackDialog = null;
  let fallbackBackdrop = null;
  let toastTimer = null;

  function showToast(message) {
    if (!toastNotice) return;
    toastNotice.textContent = message;
    toastNotice.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastNotice.classList.remove('is-visible');
    }, 3200);
  }

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
    document.documentElement.classList.toggle('menu-open', open);
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

  /* ============================================================
     DATE RESTRICTOR & BOOKING LOGIC
     ============================================================ */
  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseLocalDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function addDays(str, days) {
    const d = parseLocalDate(str);
    if (!d) return '';
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  const todayStr = formatDate(new Date());
  const tomorrowStr = addDays(todayStr, 1);

  // Set initial minimum date to current date and check-out to tomorrow
  if (bookingCheckIn) bookingCheckIn.min = todayStr;
  if (bookingCheckOut) bookingCheckOut.min = tomorrowStr;
  if (heroCheckIn) heroCheckIn.min = todayStr;
  if (heroCheckOut) heroCheckOut.min = tomorrowStr;

  function updateStayDuration() {
    if (!bookingCheckIn || !bookingCheckOut || !bookingDuration || !bookingStayBadge) return;
    const inDate = parseLocalDate(bookingCheckIn.value);
    const outDate = parseLocalDate(bookingCheckOut.value);
    if (inDate && outDate && outDate > inDate) {
      const diffTime = outDate.getTime() - inDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      bookingStayBadge.textContent = diffDays + (diffDays === 1 ? ' night' : ' nights') + ' stay';
      bookingDuration.hidden = false;
    } else {
      bookingDuration.hidden = true;
    }
  }

  function handleCheckInChange(inInput, outInput) {
    if (!inInput || !outInput) return;
    const val = inInput.value;
    if (val && val < todayStr) {
      inInput.value = todayStr;
      showToast('Past dates cannot be selected.');
    }
    const currentIn = inInput.value;
    if (currentIn) {
      const nextMinOut = addDays(currentIn, 1);
      outInput.min = nextMinOut;
      if (!outInput.value || outInput.value <= currentIn) {
        outInput.value = nextMinOut;
      }
    } else {
      outInput.min = tomorrowStr;
    }
    updateStayDuration();
  }

  function handleCheckOutChange(inInput, outInput) {
    if (!inInput || !outInput) return;
    const currentIn = inInput.value || todayStr;
    const minAllowedOut = addDays(currentIn, 1);
    if (outInput.value && outInput.value < minAllowedOut) {
      outInput.value = minAllowedOut;
      showToast('Check-out must be at least 1 day after check-in.');
    }
    updateStayDuration();
  }

  if (bookingCheckIn && bookingCheckOut) {
    bookingCheckIn.addEventListener('change', function () { handleCheckInChange(bookingCheckIn, bookingCheckOut); });
    bookingCheckIn.addEventListener('input', function () { handleCheckInChange(bookingCheckIn, bookingCheckOut); });
    bookingCheckOut.addEventListener('change', function () { handleCheckOutChange(bookingCheckIn, bookingCheckOut); });
    bookingCheckOut.addEventListener('input', function () { handleCheckOutChange(bookingCheckIn, bookingCheckOut); });
  }

  if (heroCheckIn && heroCheckOut) {
    heroCheckIn.addEventListener('change', function () { handleCheckInChange(heroCheckIn, heroCheckOut); });
    heroCheckIn.addEventListener('input', function () { handleCheckInChange(heroCheckIn, heroCheckOut); });
    heroCheckOut.addEventListener('change', function () { handleCheckOutChange(heroCheckIn, heroCheckOut); });
    heroCheckOut.addEventListener('input', function () { handleCheckOutChange(heroCheckIn, heroCheckOut); });
  }

  if (heroBookingBar) {
    heroBookingBar.addEventListener('submit', function (event) {
      event.preventDefault();
      if (bookingCheckIn && heroCheckIn) bookingCheckIn.value = heroCheckIn.value;
      if (bookingCheckOut && heroCheckOut) {
        bookingCheckOut.min = heroCheckOut.min;
        bookingCheckOut.value = heroCheckOut.value;
      }
      if (bookingGuests && heroGuests) bookingGuests.value = heroGuests.value;
      updateStayDuration();
      openBooking(heroBookingBar.querySelector('button[type="submit"]'));
    });
  }

  function openBooking(trigger) {
    triggerBeforeDialog = trigger || document.activeElement;
    setMenu(false);
    if (bookingForm) bookingForm.hidden = false;
    if (bookingSuccess) bookingSuccess.hidden = true;
    updateStayDuration();
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
    const checkIn = data.get('check-in') || '';
    const checkOut = data.get('check-out') || '';
    const note = data.get('note') || 'None';

    // Strict validation: past dates are blocked
    if (checkIn && checkIn < todayStr) {
      showToast('Check-in cannot be in the past. Please select today or later.');
      if (bookingCheckIn) bookingCheckIn.focus();
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      showToast('Check-out must be after check-in.');
      if (bookingCheckOut) bookingCheckOut.focus();
      return;
    }

    const message = [
      'Hello Casita Lia,',
      '',
      'I would like to enquire about a stay.',
      '',
      'Name: ' + name,
      'Email: ' + (data.get('email') || ''),
      'Check in: ' + (checkIn || 'Not specified'),
      'Check out: ' + (checkOut || 'Not specified'),
      'Guests: ' + (data.get('guests') || ''),
      'Note: ' + note
    ].join('\n');

    window.location.href = 'mailto:hello@casitalia.com?subject=' + encodeURIComponent('Casita Lia stay enquiry — ' + name) + '&body=' + encodeURIComponent(message);
    bookingForm.hidden = true;
    if (bookingSuccess) bookingSuccess.hidden = false;
    const responseButton = bookingSuccess && bookingSuccess.querySelector('button');
    if (responseButton) responseButton.focus();
  });

  /* ============================================================
     COPY ADDRESS FEATURE
     ============================================================ */
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', function () {
      const addressText = copyAddressBtn.getAttribute('data-address') || 'The Rochester, Parklane, Rochester';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addressText).then(
          function () { showToast('Address copied to clipboard!'); },
          function () { fallbackCopy(addressText); }
        );
      } else {
        fallbackCopy(addressText);
      }
    });
  }

  function fallbackCopy(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      showToast('Address copied to clipboard!');
    } catch (e) {
      showToast('Address: ' + text);
    }
    el.remove();
  }

  /* ============================================================
     LOCATION SPOT SELECTOR
     ============================================================ */
  spotButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spotButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      const title = btn.getAttribute('data-spot-title') || '';
      const dist = btn.getAttribute('data-spot-dist') || '';
      if (spotTitle) spotTitle.textContent = title;
      if (spotDist) spotDist.textContent = dist + ' from Casita Lia';
    });
  });

  /* ============================================================
     AMENITY CATEGORY FILTER
     ============================================================ */
  const amenityMap = {
    all: ['Restful bedrooms', 'Equipped kitchen', 'Fast Wi‑Fi', 'Air conditioned', 'Smart entertainment', 'Secure building', 'Parking access', 'Pool access'],
    living: ['Fast Wi‑Fi', 'Air conditioned', 'Smart entertainment'],
    sleep: ['Restful bedrooms', 'Air conditioned'],
    kitchen: ['Equipped kitchen'],
    building: ['Secure building', 'Parking access'],
    wellness: ['Pool access']
  };

  amenityButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const filter = button.getAttribute('data-amenity-filter') || 'all';
      amenityButtons.forEach(function (b) { b.classList.remove('is-active'); });
      button.classList.add('is-active');

      const allowedTitles = amenityMap[filter] || amenityMap.all;
      featureCards.forEach(function (card) {
        const titleEl = card.querySelector('h3');
        const text = titleEl ? titleEl.textContent.trim() : '';
        const match = filter === 'all' || allowedTitles.indexOf(text) !== -1;
        card.classList.toggle('is-dimmed', !match);
        card.classList.toggle('is-highlighted', match && filter !== 'all');
      });
    });
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

  /* ============================================================
     BACK TO TOP
     ============================================================ */
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  /* ============================================================
     SCROLL SYNCHRONIZATION: HEADER, STICKY BAR, SCROLL-SPY
     ============================================================ */
  let ticking = false;

  function updateScrollSpy(offset) {
    if (!navLinks.length || !sections.length) return;
    let currentId = '';
    const scrollPos = offset + 120;

    for (let i = sections.length - 1; i >= 0; i--) {
      const sec = sections[i];
      if (sec.offsetTop <= scrollPos) {
        currentId = sec.id;
        break;
      }
    }

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href && href === '#' + currentId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  function syncScroll() {
    const offset = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', offset > 24);
    if (motionAllowed) document.documentElement.style.setProperty('--scroll-y', Math.min(offset, 1000) + 'px');

    // Sticky book micro-bar appears after scrolling past hero
    if (stickyBookBar) {
      stickyBookBar.classList.toggle('is-visible', offset > 480);
    }

    // Back to top button appears after scrolling down
    if (backToTopBtn) {
      backToTopBtn.classList.toggle('is-visible', offset > 550);
    }

    // Update navigation active states
    updateScrollSpy(offset);

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
