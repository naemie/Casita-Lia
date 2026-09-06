(function () {
  'use strict';

  // Property configuration. The editable source is #casita-config in index.html.
  // These confirmed defaults also keep a missing or malformed configuration usable.
  const defaults = {
    bookingEmail: '', bookingURL: '', siteURL: '',
    parkingPrice: 100, poolPrice: 200, maximumGuests: 8, bedrooms: 3,
    checkInTime: '15:00', checkOutTime: '12:00'
  };

  function safeWebURL(value, base) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = base ? new URL(value.trim(), base) : new URL(value.trim());
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (error) { return ''; }
  }

  function safeEmail(value) {
    return typeof value === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim()) ? value.trim() : '';
  }

  function readConfiguration() {
    const element = document.getElementById('casita-config');
    let configured = {};
    try {
      const parsed = element && JSON.parse(element.textContent);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) configured = parsed;
    } catch (error) { /* Preserve the confirmed defaults if JSON needs correcting. */ }
    const config = Object.assign({}, defaults);
    ['parkingPrice', 'poolPrice'].forEach(function (key) {
      const value = configured[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) config[key] = value;
    });
    ['maximumGuests', 'bedrooms'].forEach(function (key) {
      const value = configured[key];
      if (Number.isInteger(value) && value >= 1 && value <= 100) config[key] = value;
    });
    ['checkInTime', 'checkOutTime'].forEach(function (key) {
      if (typeof configured[key] === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(configured[key])) config[key] = configured[key];
    });
    config.bookingEmail = safeEmail(document.body.dataset.bookingEmail) || safeEmail(configured.bookingEmail);
    config.bookingURL = safeWebURL(document.body.dataset.bookingUrl) || safeWebURL(configured.bookingURL);
    config.siteURL = safeWebURL(configured.siteURL);
    config.gallery = Array.isArray(configured.gallery) ? configured.gallery : [];
    return config;
  }

  function readableTime(value) {
    if (value === '12:00') return '12:00 NN';
    const parts = value.split(':');
    const hours = Number(parts[0]);
    return (hours % 12 || 12) + ':' + parts[1] + (hours >= 12 ? ' PM' : ' AM');
  }

  function initialize() {
    const root = document.documentElement;
    const body = document.body;
    const config = readConfiguration();
    const header = document.getElementById('site-header');
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const bookingDialog = document.getElementById('booking-dialog');
    const bookingForm = document.getElementById('booking-form');
    const bookingReview = document.getElementById('booking-review');
    const bookingMessage = document.getElementById('booking-message');
    const bookingEmailLink = document.getElementById('booking-email-link');
    const bookingChannelNote = document.getElementById('booking-channel-note');
    const stayDuration = document.getElementById('booking-stay-duration');
    const heroForm = document.getElementById('hero-booking-bar');
    const stickyBar = document.getElementById('sticky-book-bar');
    const toast = document.getElementById('toast-notice');
    const galleryDialog = document.getElementById('gallery-lightbox');
    const galleryImage = document.querySelector('.lightbox__image');
    const galleryTitle = document.getElementById('lightbox-title');
    const galleryCount = document.getElementById('lightbox-count');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopMedia = window.matchMedia('(min-width: 1180px)');
    const dialogTriggers = new WeakMap();
    const dialogs = Array.from(document.querySelectorAll('dialog'));
    const dialogStack = [];
    const bookingFields = getStayFields('booking');
    const heroFields = getStayFields('hero');
    const bookingNote = document.getElementById('booking-note');
    const bookingPolicy = document.getElementById('booking-policy');
    const bookingStayFields = document.getElementById('booking-stay-fields');
    const policyContainer = bookingForm && bookingForm.querySelector('.booking-policy');
    const dialogTitle = document.getElementById('booking-dialog-title');
    const dialogIntro = bookingDialog && bookingDialog.querySelector('.dialog-intro');
    const formNote = bookingForm && bookingForm.querySelector('.form-note');
    const submitButton = bookingForm && bookingForm.querySelector('button[type="submit"]');
    const reviewHeading = bookingReview && bookingReview.querySelector('h3');
    const reviewIntro = bookingReview && bookingReview.querySelector('h3 + p');
    const noteOptionalLabel = bookingNote && bookingNote.parentElement.querySelector('span');
    const bookingOnlyFields = [bookingFields.checkIn, bookingFields.checkOut, bookingFields.guests, bookingPolicy].filter(Boolean).map(function (field) {
      return { field: field, required: field.required, disabled: field.disabled };
    });
    const bookingCopy = {
      title: dialogTitle && dialogTitle.innerHTML,
      intro: dialogIntro && dialogIntro.textContent,
      formNote: formNote && formNote.textContent,
      reviewHeading: reviewHeading && reviewHeading.textContent,
      reviewIntro: reviewIntro && reviewIntro.textContent,
      notePrompt: bookingNote && bookingNote.parentElement.firstChild.textContent,
      noteLabel: noteOptionalLabel && noteOptionalLabel.textContent,
      notePlaceholder: bookingNote && bookingNote.placeholder
    };
    let inquiryMode = 'booking';
    let toastTimer;
    let midnightTimer;
    let scrollPending = false;
    let galleryIndex = 0;
    let touchStart = null;

    // Hydrate all business facts and form options from the same configuration.
    function hydrateProperty() {
      document.querySelectorAll('[data-property]').forEach(function (element) {
        const key = element.dataset.property;
        if (['parkingPrice', 'poolPrice'].includes(key)) element.textContent = '₱' + config[key].toLocaleString('en-PH', { maximumFractionDigits: 2 });
        else if (['maximumGuests', 'bedrooms'].includes(key)) element.textContent = String(config[key]);
        else if (['checkInTime', 'checkOutTime'].includes(key)) element.textContent = readableTime(config[key]);
      });
      [bookingFields.guests, heroFields.guests].filter(Boolean).forEach(function (select) {
        const selected = Math.min(Math.max(Number(select.value) || 1, 1), config.maximumGuests);
        const options = document.createDocumentFragment();
        for (let count = 1; count <= config.maximumGuests; count += 1) {
          const option = document.createElement('option');
          option.value = String(count);
          option.textContent = count + (count === 1 ? ' guest' : ' guests');
          option.selected = count === selected;
          options.appendChild(option);
        }
        select.replaceChildren(options);
      });
      const description = 'Stay at Casita Lia, a cozy ' + config.bedrooms + '-bedroom condominium at The Rochester in San Joaquin, Pasig City. Space for up to ' + config.maximumGuests + ' guests, a private balcony, and the comforts of home.';
      document.title = 'Casita Lia | Cozy ' + config.bedrooms + '-Bedroom Stay at The Rochester Pasig';
      const descriptionMeta = document.querySelector('meta[name="description"]');
      if (descriptionMeta) descriptionMeta.content = description;
      ['og:description', 'twitter:description'].forEach(function (name) {
        const meta = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
        if (meta) meta.content = description;
      });
      ['og:title', 'twitter:title'].forEach(function (name) {
        const meta = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
        if (meta) meta.content = 'Casita Lia · ' + config.bedrooms + '-Bedroom Stay at The Rochester, Pasig';
      });
      const schemaElement = document.getElementById('lodging-schema');
      if (schemaElement) {
        try {
          const schema = JSON.parse(schemaElement.textContent);
          schema.description = description;
          schema.checkinTime = config.checkInTime;
          schema.checkoutTime = config.checkOutTime;
          schema.containsPlace = Object.assign({}, schema.containsPlace, {
            '@type': 'Apartment', numberOfBedrooms: config.bedrooms,
            occupancy: { '@type': 'QuantitativeValue', maxValue: config.maximumGuests }
          });
          if (config.siteURL) schema.url = config.siteURL;
          schemaElement.textContent = JSON.stringify(schema);
        } catch (error) { /* Leave independently valid static metadata available. */ }
      }
      if (config.siteURL) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
          canonical = document.createElement('link');
          canonical.rel = 'canonical';
          document.head.appendChild(canonical);
        }
        canonical.href = config.siteURL;
        ['og:url', 'og:image', 'twitter:image'].forEach(function (name) {
          let meta = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
            document.head.appendChild(meta);
          }
          meta.content = name === 'og:url' ? config.siteURL : new URL('assets/images/casita-lia-hero.jpg', config.siteURL).href;
        });
      }
    }

    hydrateProperty();
    root.classList.add('js-enabled');
    const year = document.getElementById('current-year');
    if (year) year.textContent = String(new Date().getFullYear());

    function getStayFields(prefix) {
      return {
        checkIn: document.getElementById(prefix + '-check-in'),
        checkOut: document.getElementById(prefix + '-check-out'),
        guests: document.getElementById(prefix + '-guests')
      };
    }

    function showToast(message) {
      if (!toast) return;
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('is-visible');
      toastTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 6500);
    }

    // Native dialogs provide Escape handling and focus containment; this stack
    // restores focus correctly when a policy is opened above the inquiry form.
    function currentDialog() {
      for (let index = dialogStack.length - 1; index >= 0; index -= 1) {
        if (dialogStack[index].open) return dialogStack[index];
      }
      return null;
    }

    function synchronizeDialogState() {
      const isOpen = Boolean(currentDialog());
      root.classList.toggle('dialog-open', isOpen);
      body.classList.toggle('dialog-open', isOpen);
      body.classList.toggle('menu-open', Boolean(mobileMenu && mobileMenu.open));
      if (menuToggle) {
        const menuOpen = Boolean(mobileMenu && mobileMenu.open);
        menuToggle.setAttribute('aria-expanded', String(menuOpen));
        menuToggle.setAttribute('aria-label', menuOpen ? 'Close navigation menu' : 'Open navigation menu');
      }
      scheduleScrollUpdate();
    }

    function openDialog(dialog, trigger) {
      if (!dialog || dialog.open) return;
      let returnFocus = trigger || document.activeElement;
      if (mobileMenu && mobileMenu.open && dialog !== mobileMenu) {
        returnFocus = menuToggle || returnFocus;
        mobileMenu.close();
      }
      dialogTriggers.set(dialog, returnFocus);
      dialogStack.push(dialog);
      dialog.showModal();
      synchronizeDialogState();
    }

    function closeDialog(dialog) {
      if (dialog && dialog.open) {
        dialog.close();
        synchronizeDialogState();
      }
    }

    dialogs.forEach(function (dialog) {
      dialog.addEventListener('close', function () {
        const index = dialogStack.lastIndexOf(dialog);
        if (index >= 0) dialogStack.splice(index, 1);
        synchronizeDialogState();
        const trigger = dialogTriggers.get(dialog);
        window.requestAnimationFrame(function () {
          if (!trigger || !trigger.isConnected || trigger.closest('dialog:not([open])')) return;
          const active = currentDialog();
          if (!active || active.contains(trigger)) trigger.focus({ preventScroll: true });
        });
      });
      dialog.addEventListener('click', function (event) {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
      });
    });

    document.querySelectorAll('[data-close-dialog]').forEach(function (button) {
      button.addEventListener('click', function () { closeDialog(button.closest('dialog')); });
    });
    document.querySelectorAll('[data-open-dialog]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        openDialog(document.getElementById(button.dataset.openDialog), button);
      });
    });
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', function () {
        if (mobileMenu.open) closeDialog(mobileMenu);
        else openDialog(mobileMenu, menuToggle);
      });
    }
    const mobileClose = document.querySelector('.mobile-menu__close');
    if (mobileClose && !mobileClose.hasAttribute('data-close-dialog')) {
      mobileClose.addEventListener('click', function () { closeDialog(mobileMenu); });
    }
    if (mobileMenu) {
      mobileMenu.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function () { closeDialog(mobileMenu); });
      });
    }

    // Validate local calendar dates; use UTC day numbers for night counts so
    // daylight-saving changes cannot turn a one-night stay into zero nights.
    function formatDate(date) {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function parseDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
      const parts = value.split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null;
      return date;
    }

    function nextDay(value) {
      const date = parseDate(value);
      if (!date) return '';
      date.setDate(date.getDate() + 1);
      return formatDate(date);
    }

    function nightsBetween(checkIn, checkOut) {
      const arrival = parseDate(checkIn);
      const departure = parseDate(checkOut);
      if (!arrival || !departure || departure <= arrival) return 0;
      return Math.round((Date.UTC(departure.getFullYear(), departure.getMonth(), departure.getDate()) - Date.UTC(arrival.getFullYear(), arrival.getMonth(), arrival.getDate())) / 86400000);
    }

    function validateStay(fields) {
      const today = formatDate(new Date());
      const tomorrow = nextDay(today);
      const checkIn = fields.checkIn;
      const checkOut = fields.checkOut;
      if (checkIn) {
        checkIn.min = today;
        checkIn.setCustomValidity('');
        if (checkIn.value && !parseDate(checkIn.value)) checkIn.setCustomValidity('Please enter a valid check-in date.');
        else if (checkIn.value && checkIn.value < today) checkIn.setCustomValidity('Choose today or a later check-in date.');
      }
      if (checkOut) {
        const minimum = checkIn && parseDate(checkIn.value) ? nextDay(checkIn.value) : tomorrow;
        checkOut.min = minimum > tomorrow ? minimum : tomorrow;
        checkOut.setCustomValidity('');
        if (checkOut.value && !parseDate(checkOut.value)) checkOut.setCustomValidity('Please enter a valid check-out date.');
        else if (checkOut.value && checkIn && checkIn.value && checkOut.value <= checkIn.value) checkOut.setCustomValidity('Check-out must be after check-in.');
        else if (checkOut.value && checkOut.value < tomorrow) checkOut.setCustomValidity('Choose a check-out date after today.');
      }
      if (fields.guests) {
        const guests = Number(fields.guests.value);
        fields.guests.setCustomValidity(Number.isInteger(guests) && guests >= 1 && guests <= config.maximumGuests ? '' : 'Choose between 1 and ' + config.maximumGuests + ' guests.');
      }
    }

    function updateDuration() {
      if (!stayDuration || !bookingFields.checkIn || !bookingFields.checkOut) return;
      const nights = nightsBetween(bookingFields.checkIn.value, bookingFields.checkOut.value);
      const guests = bookingFields.guests ? Number(bookingFields.guests.value) : 0;
      const guestLabel = guests >= 1 && guests <= config.maximumGuests ? guests + (guests === 1 ? ' guest' : ' guests') : 'Choose your guests';
      stayDuration.textContent = nights > 0 ? nights + (nights === 1 ? ' night' : ' nights') + ' · ' + guestLabel : 'Choose your dates · ' + guestLabel;
    }

    function copyStay(from, to) {
      Object.keys(from).forEach(function (key) {
        if (from[key] && to[key]) to[key].value = from[key].value;
      });
      validateStay(to);
      updateDuration();
    }

    function connectStayFields(fields, otherFields) {
      Object.keys(fields).forEach(function (key) {
        const field = fields[key];
        if (!field) return;
        function update() {
          validateStay(fields);
          copyStay(fields, otherFields);
        }
        field.addEventListener('input', update);
        field.addEventListener('change', function () {
          if (key === 'checkIn' && fields.checkOut && (!fields.checkOut.value || fields.checkOut.value <= field.value) && parseDate(field.value) && field.value >= formatDate(new Date())) fields.checkOut.value = nextDay(field.value);
          update();
        });
      });
    }

    function refreshCalendar() {
      validateStay(bookingFields);
      validateStay(heroFields);
      updateDuration();
      if (year) year.textContent = String(new Date().getFullYear());
      if (inquiryMode === 'booking' && bookingReview && !bookingReview.hidden && bookingFields.checkIn && !bookingFields.checkIn.validity.valid) {
        bookingReview.hidden = true;
        if (bookingForm) bookingForm.hidden = false;
        if (bookingMessage) bookingMessage.value = '';
        showToast('A new day has started. Please review your stay dates before sharing your inquiry.');
        if (bookingDialog && bookingDialog.open) bookingFields.checkIn.focus({ preventScroll: true });
      }
      window.clearTimeout(midnightTimer);
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = window.setTimeout(refreshCalendar, tomorrow.getTime() - now.getTime() + 100);
    }

    connectStayFields(bookingFields, heroFields);
    connectStayFields(heroFields, bookingFields);
    refreshCalendar();
    window.addEventListener('focus', refreshCalendar);
    window.addEventListener('pageshow', refreshCalendar);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshCalendar(); });

    function showBookingFields() {
      if (bookingForm) bookingForm.hidden = false;
      if (bookingReview) bookingReview.hidden = true;
      refreshCalendar();
    }

    function setInquiryMode(mode) {
      inquiryMode = mode;
      const isQuestion = mode === 'question';
      if (bookingStayFields) bookingStayFields.hidden = isQuestion;
      if (policyContainer) policyContainer.hidden = isQuestion;
      document.querySelectorAll('[data-booking-only]').forEach(function (element) { element.hidden = isQuestion; });
      bookingOnlyFields.forEach(function (entry) {
        entry.field.required = isQuestion ? false : entry.required;
        // Disabled fields retain their values while staying out of validation
        // and FormData when a guest only wants to ask a question.
        entry.field.disabled = isQuestion ? true : entry.disabled;
      });
      if (bookingNote) {
        bookingNote.required = isQuestion;
        bookingNote.setCustomValidity('');
        bookingNote.placeholder = isQuestion ? 'What would you like to know about Casita Lia?' : bookingCopy.notePlaceholder;
        const prompt = bookingNote.parentElement.firstChild;
        if (prompt && prompt.nodeType === Node.TEXT_NODE) prompt.textContent = isQuestion ? 'Your question ' : bookingCopy.notePrompt;
      }
      if (noteOptionalLabel) noteOptionalLabel.textContent = isQuestion ? 'Required' : bookingCopy.noteLabel;
      if (dialogTitle) dialogTitle.innerHTML = isQuestion ? 'Ask your <em>question.</em>' : bookingCopy.title;
      if (dialogIntro) dialogIntro.textContent = isQuestion ? 'Have something in mind? Prepare a question to share with your host. No stay dates are needed.' : bookingCopy.intro;
      if (formNote) formNote.textContent = isQuestion ? 'Your message is prepared here for you to review and share with your host.' : bookingCopy.formNote;
      if (reviewHeading) reviewHeading.textContent = isQuestion ? 'Your question is ready.' : bookingCopy.reviewHeading;
      if (reviewIntro) reviewIntro.textContent = isQuestion ? 'Review your message, then share it with your host.' : bookingCopy.reviewIntro;
      if (submitButton) {
        const label = isQuestion ? 'Prepare Question ' : 'Prepare Booking Inquiry ';
        if (submitButton.firstChild && submitButton.firstChild.nodeType === Node.TEXT_NODE) submitButton.firstChild.textContent = label;
        else submitButton.prepend(document.createTextNode(label));
      }
      const copyButton = bookingReview && bookingReview.querySelector('[data-copy-inquiry]');
      if (copyButton) {
        const label = isQuestion ? 'Copy Question ' : 'Copy Inquiry ';
        if (copyButton.firstChild && copyButton.firstChild.nodeType === Node.TEXT_NODE) copyButton.firstChild.textContent = label;
        else copyButton.prepend(document.createTextNode(label));
      }
    }

    function openBooking(trigger) {
      setInquiryMode('booking');
      showBookingFields();
      openDialog(bookingDialog, trigger);
    }

    document.querySelectorAll('[data-open-booking]:not([data-open-question])').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        openBooking(button);
      });
    });
    document.querySelectorAll('[data-open-question]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        setInquiryMode('question');
        showBookingFields();
        openDialog(bookingDialog, button);
      });
    });
    if (heroForm) {
      heroForm.noValidate = true;
      heroForm.addEventListener('submit', function (event) {
        event.preventDefault();
        validateStay(heroFields);
        if (!heroForm.reportValidity()) return;
        copyStay(heroFields, bookingFields);
        openBooking(event.submitter || heroForm.querySelector('button[type="submit"]'));
      });
    }

    function readableDate(value) {
      const date = parseDate(value);
      return date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : value;
    }

    // Direct contact is explicit. Opening an external channel never implies that
    // a message was sent or that dates have been reserved.
    function contactDestination() {
      const email = safeEmail(body.dataset.bookingEmail) || config.bookingEmail;
      const url = safeWebURL(body.dataset.bookingUrl) || config.bookingURL;
      if (email) return { type: 'email', value: email, label: 'Open Email' };
      if (!url) return null;
      const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (hostname === 'm.me' || /(^|\.)messenger\.com$/.test(hostname) || /(^|\.)facebook\.com$/.test(hostname)) return { type: 'messenger', value: url, label: 'Send via Messenger' };
      if (/(^|\.)airbnb\.(com|com\.ph|co\.uk|com\.au|ca)$/.test(hostname)) return { type: 'airbnb', value: url, label: 'Continue on Airbnb' };
      return { type: 'web', value: url, label: 'Contact Your Host' };
    }

    function updateContactFooter() {
      const note = document.getElementById('contact-channel-note');
      const destination = contactDestination();
      if (!note || !destination) return;
      const link = document.createElement('a');
      link.className = 'text-link';
      link.textContent = destination.type === 'email' ? destination.value : destination.label;
      link.href = destination.type === 'email' ? 'mailto:' + destination.value : destination.value;
      if (destination.type !== 'email') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      note.replaceChildren(document.createTextNode('Get in touch with your host. '), link);
    }

    function configureInquiryDestination(message, name) {
      if (!bookingEmailLink) return;
      const isQuestion = inquiryMode === 'question';
      const destination = contactDestination();
      const copyButton = bookingReview && bookingReview.querySelector('[data-copy-inquiry]');
      if (copyButton) {
        copyButton.classList.toggle('button--dark', !destination);
        copyButton.classList.toggle('button--secondary', Boolean(destination));
      }
      bookingEmailLink.hidden = !destination;
      bookingEmailLink.removeAttribute('href');
      bookingEmailLink.removeAttribute('target');
      bookingEmailLink.removeAttribute('rel');
      if (destination && destination.type === 'email') {
        bookingEmailLink.href = 'mailto:' + encodeURIComponent(destination.value).replace('%40', '@') + '?subject=' + encodeURIComponent((isQuestion ? 'Casita Lia question — ' : 'Casita Lia stay inquiry — ') + name) + '&body=' + encodeURIComponent(message);
        bookingEmailLink.textContent = destination.label;
        if (bookingChannelNote) bookingChannelNote.textContent = isQuestion ? 'Your question is ready. Open your email app to review and send it to your host.' : 'Your inquiry is ready. Open your email app to review and send it to the host. Dates and rates are confirmed by the host.';
      } else if (destination) {
        bookingEmailLink.href = destination.value;
        bookingEmailLink.target = '_blank';
        bookingEmailLink.rel = 'noopener noreferrer';
        bookingEmailLink.textContent = destination.label;
        if (bookingChannelNote) bookingChannelNote.textContent = 'Open your host’s ' + (destination.type === 'messenger' ? 'Messenger conversation' : destination.type === 'airbnb' ? 'Airbnb listing' : 'contact page') + ' to send your ' + (isQuestion ? 'question' : 'inquiry') + '. We’ll also try to copy your message so it is ready to paste. ' + (isQuestion ? 'You send it there.' : 'The host confirms dates and rates.');
      } else if (bookingChannelNote) {
        bookingChannelNote.textContent = isQuestion ? 'Host contact details are being updated. You can copy your question and share it with your host.' : 'Booking contact details are being updated. You can copy your inquiry and share it with your host.';
      }
      updateContactFooter();
    }

    updateContactFooter();
    if (bookingEmailLink) bookingEmailLink.addEventListener('click', async function () {
      const destination = contactDestination();
      if (!destination || !bookingMessage) return;
      const status = document.getElementById('booking-copy-status');
      if (destination.type === 'email') {
        if (status) status.textContent = 'Continue in your email app to send your message. Opening a draft does not confirm a booking.';
        return;
      }
      // Do not delay or replace the link navigation: a genuine user click opens
      // the official page even if clipboard permission is unavailable.
      const copied = await copyText(bookingMessage.value);
      if (status) status.textContent = copied ? 'Message copied. Paste and send it on your host’s contact page. Dates are confirmed by the host.' : 'Continue on your host’s contact page. If you need your prepared message, use Copy Inquiry or select the text above.';
    });

    if (bookingForm) {
      bookingForm.noValidate = true;
      bookingForm.addEventListener('submit', function (event) {
        event.preventDefault();
        refreshCalendar();
        const nameInput = bookingForm.elements.namedItem('name');
        if (nameInput) nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
        if (bookingNote) bookingNote.setCustomValidity(inquiryMode === 'question' && !bookingNote.value.trim() ? 'Please enter your question.' : '');
        if (!bookingForm.reportValidity()) return;
        const data = new FormData(bookingForm);
        const name = String(data.get('name') || '').trim();
        const checkIn = String(data.get('check-in') || '');
        const checkOut = String(data.get('check-out') || '');
        const nights = nightsBetween(checkIn, checkOut);
        const message = (inquiryMode === 'question' ? [
          'Hello Casita Lia,', '',
          'I have a question about Casita Lia.', '',
          'Name: ' + name,
          'Email: ' + String(data.get('email') || '').trim(), '',
          'Question: ' + String(data.get('note') || '').trim()
        ] : [
          'Hello Casita Lia,', '',
          'I would like to ask about availability and rates for a stay.', '',
          'Name: ' + name,
          'Email: ' + String(data.get('email') || '').trim(),
          'Check-in: ' + readableDate(checkIn) + ' (' + readableTime(config.checkInTime) + ' onwards)',
          'Check-out: ' + readableDate(checkOut) + ' (' + readableTime(config.checkOutTime) + ')',
          'Duration: ' + nights + (nights === 1 ? ' night' : ' nights'),
          'Guests: ' + String(data.get('guests') || ''),
          'Requests or questions: ' + (String(data.get('note') || '').trim() || 'None'), '',
          'I have read and agree to Casita Lia’s cancellation and rescheduling policy.',
          'I understand this is an inquiry. Availability, rates, and the reservation require confirmation from the host.'
        ]).join('\n');
        if (bookingMessage) bookingMessage.value = message;
        configureInquiryDestination(message, name);
        const copyStatus = document.getElementById('booking-copy-status');
        if (copyStatus) copyStatus.textContent = '';
        if (bookingReview) {
          bookingForm.hidden = true;
          bookingReview.hidden = false;
          const heading = bookingReview.querySelector('h2, h3, [data-review-heading]');
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
          bookingDialog.scrollTop = 0;
        }
      });
      const nameInput = bookingForm.elements.namedItem('name');
      if (nameInput) nameInput.addEventListener('input', function () { nameInput.setCustomValidity(''); });
      if (bookingNote) bookingNote.addEventListener('input', function () { bookingNote.setCustomValidity(''); });
    }

    document.querySelectorAll('[data-edit-booking]').forEach(function (button) {
      button.addEventListener('click', function () {
        showBookingFields();
        const field = inquiryMode === 'question' ? bookingNote : bookingFields.checkIn;
        if (field) field.focus({ preventScroll: true });
      });
    });

    // Clipboard helpers are selection-based fallbacks as well as Clipboard API
    // support, and keep guest details entirely in the current page.
    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) { /* Try the browser's selection-based copy support. */ }
      }
      const originalFocus = document.activeElement;
      const temporary = document.createElement('textarea');
      temporary.value = text;
      temporary.setAttribute('readonly', '');
      temporary.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      (currentDialog() || body).appendChild(temporary);
      temporary.focus({ preventScroll: true });
      temporary.select();
      let copied = false;
      try { copied = document.execCommand('copy') === true; } catch (error) { copied = false; }
      temporary.remove();
      if (originalFocus && originalFocus.isConnected) originalFocus.focus({ preventScroll: true });
      return copied;
    }

    document.querySelectorAll('[data-copy-inquiry]').forEach(function (button) {
      button.addEventListener('click', async function () {
        if (!bookingMessage || !bookingMessage.value) return;
        button.disabled = true;
        const copied = await copyText(bookingMessage.value);
        button.disabled = false;
        let status = document.getElementById('booking-copy-status');
        if (!status && bookingReview) {
          status = document.createElement('p');
          status.id = 'booking-copy-status';
          status.className = 'booking-copy-status';
          status.setAttribute('role', 'status');
          bookingReview.appendChild(status);
        }
        const isQuestion = inquiryMode === 'question';
        const message = copied ? (isQuestion ? 'Question copied. Share it with your host.' : 'Inquiry copied. Share it with your host to request your dates.') : (isQuestion ? 'Copy was unavailable. Select your question and copy it manually.' : 'Copy was unavailable. Select the inquiry and copy it manually.');
        if (status) status.textContent = message;
        if (!copied) {
          bookingMessage.focus();
          bookingMessage.select();
        }
        showToast(message);
      });
    });

    document.querySelectorAll('[data-copy-address]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const address = button.dataset.address || button.dataset.copyAddress || 'The Rochester Condominium, Parklane Tower, San Joaquin, Pasig City';
        const copied = await copyText(address);
        showToast(copied ? 'Address copied to your clipboard.' : 'Copy unavailable. Address: ' + address);
      });
    });

    // The embedded map is created only after a guest requests it.
    document.querySelectorAll('[data-load-map]').forEach(function (button) {
      button.addEventListener('click', function () {
        const container = document.getElementById('map-container');
        if (!container || container.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.title = 'Map of The Rochester Condominium, San Joaquin, Pasig City';
        frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent('The Rochester, San Joaquin, Pasig City') + '&output=embed';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer-when-downgrade';
        frame.allowFullscreen = true;
        frame.width = '100%';
        frame.height = '100%';
        frame.style.border = '0';
        container.replaceChildren(frame);
        container.classList.add('is-loaded');
        frame.focus({ preventScroll: true });
      });
    });

    // Gallery data can grow to 20 real photos. The editorial grid previews the
    // first five; categories, thumbnails, counters, swipe and keys share one list.
    const galleryButtons = Array.from(document.querySelectorAll('[data-gallery-index]'));

    function safeImageSource(value) {
      if (typeof value !== 'string' || !value.trim()) return '';
      const source = value.trim();
      try {
        const url = new URL(source, document.baseURI);
        const localFile = window.location.protocol === 'file:' && url.protocol === 'file:' && !/^[a-z][a-z\d+.-]*:/i.test(source);
        return !url.username && !url.password && (/^https?:$/.test(url.protocol) || localFile) ? source : '';
      } catch (error) { return ''; }
    }

    function normalizePhoto(photo) {
      if (!photo || typeof photo !== 'object') return null;
      const src = safeImageSource(photo.src);
      if (!src) return null;
      const title = typeof photo.title === 'string' && photo.title.trim() ? photo.title.trim() : 'Casita Lia';
      return {
        src: src, title: title,
        alt: typeof photo.alt === 'string' && photo.alt.trim() ? photo.alt.trim() : title,
        category: typeof photo.category === 'string' && photo.category.trim() ? photo.category.trim() : 'The Stay',
        thumbnail: safeImageSource(photo.thumbnail) || src
      };
    }

    const originalPictures = new Map();
    const originalGallery = galleryButtons.map(function (button) {
      const image = button.querySelector('img');
      const label = button.querySelector('.gallery-item__label');
      if (!image) return null;
      const picture = button.querySelector('picture');
      if (picture) originalPictures.set(new URL(image.getAttribute('src'), document.baseURI).href, picture.cloneNode(true));
      return normalizePhoto({
        src: button.dataset.gallerySrc || image.getAttribute('src'),
        title: button.dataset.galleryTitle || (label ? label.textContent.trim() : image.alt),
        alt: button.dataset.galleryAlt || image.alt,
        category: button.dataset.galleryCategory
      });
    }).filter(Boolean);
    const configuredGallery = config.gallery.map(normalizePhoto).filter(Boolean).slice(0, 20);
    const gallery = configuredGallery.length ? configuredGallery : originalGallery;
    const galleryCategories = Array.from(new Set(gallery.map(function (photo) { return photo.category; })));
    const filterContainers = Array.from(document.querySelectorAll('.gallery-filters, [data-gallery-filters]'));
    let galleryCategory = '';
    let visibleGallery = gallery.map(function (_, index) { return index; });
    let thumbnailButtons = [];

    function photoPicture(photo, thumbnail) {
      const existing = originalPictures.get(new URL(photo.src, document.baseURI).href);
      let picture;
      if (existing && (!thumbnail || photo.thumbnail === photo.src)) {
        picture = existing.cloneNode(true);
        if (thumbnail) picture.querySelectorAll('source').forEach(function (source) { source.sizes = '75px'; });
      } else {
        picture = document.createElement('picture');
        const image = document.createElement('img');
        image.src = thumbnail ? photo.thumbnail : photo.src;
        // A stable frame prevents layout movement while additional photos load.
        image.width = thumbnail ? 100 : 1200;
        image.height = thumbnail ? 60 : 800;
        picture.appendChild(image);
      }
      const image = picture.querySelector('img');
      image.alt = thumbnail ? '' : photo.alt;
      image.loading = 'lazy';
      image.decoding = 'async';
      if (thumbnail) {
        image.width = 100;
        image.height = 60;
      }
      return picture;
    }

    galleryButtons.forEach(function (button) {
      const index = Number(button.dataset.galleryIndex);
      const photo = gallery[index];
      if (!Number.isInteger(index) || !photo) {
        button.hidden = true;
        return;
      }
      const picture = button.querySelector('picture, img');
      if (picture) picture.replaceWith(photoPicture(photo, false));
      const label = button.querySelector('.gallery-item__label');
      if (label && label.firstChild && label.firstChild.nodeType === Node.TEXT_NODE) label.firstChild.textContent = photo.title;
      button.setAttribute('aria-label', 'Open photo: ' + photo.title);
      button.addEventListener('click', function () { openGallery(index, button); });
    });

    document.querySelectorAll('[data-photo-count]').forEach(function (element) {
      element.textContent = element.dataset.photoCount === 'padded' ? String(gallery.length).padStart(2, '0') : String(gallery.length);
    });

    const thumbnailContainer = galleryDialog && galleryDialog.querySelector('.lightbox__thumbs');
    if (thumbnailContainer) {
      const fragment = document.createDocumentFragment();
      gallery.forEach(function (photo, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.galleryThumb = String(index);
        button.setAttribute('aria-label', photo.title);
        button.appendChild(photoPicture(photo, true));
        button.addEventListener('click', function () { showGalleryImage(index); });
        fragment.appendChild(button);
        thumbnailButtons.push(button);
      });
      thumbnailContainer.replaceChildren(fragment);
    }

    function filterGallery(category) {
      galleryCategory = category;
      visibleGallery = gallery.map(function (_, index) { return index; }).filter(function (index) { return !category || gallery[index].category === category; });
      thumbnailButtons.forEach(function (button) { button.hidden = !visibleGallery.includes(Number(button.dataset.galleryThumb)); });
      filterContainers.forEach(function (container) {
        container.querySelectorAll('[data-gallery-filter]').forEach(function (button) {
          button.setAttribute('aria-pressed', String(button.dataset.galleryFilter === category));
        });
      });
      showGalleryImage(visibleGallery.includes(galleryIndex) ? galleryIndex : visibleGallery[0]);
    }

    filterContainers.forEach(function (container) {
      const showFilters = gallery.length > 5 && galleryCategories.length > 1;
      container.hidden = !showFilters;
      if (!showFilters) return;
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', 'Filter photos by room');
      const fragment = document.createDocumentFragment();
      [''].concat(galleryCategories).forEach(function (category) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gallery-filter';
        button.dataset.galleryFilter = category;
        button.textContent = category || 'All';
        button.setAttribute('aria-pressed', String(category === galleryCategory));
        button.addEventListener('click', function () { filterGallery(category); });
        fragment.appendChild(button);
      });
      container.replaceChildren(fragment);
    });

    function showGalleryImage(index) {
      if (!visibleGallery.length) return;
      galleryIndex = visibleGallery.includes(index) ? index : visibleGallery[0];
      const photo = gallery[galleryIndex];
      if (galleryImage) {
        galleryImage.src = photo.src;
        galleryImage.alt = photo.alt;
      }
      if (galleryTitle) galleryTitle.textContent = photo.title;
      if (galleryCount) galleryCount.textContent = (visibleGallery.indexOf(galleryIndex) + 1) + ' / ' + visibleGallery.length;
      thumbnailButtons.forEach(function (button) {
        const isCurrent = Number(button.dataset.galleryThumb) === galleryIndex;
        button.classList.toggle('is-active', isCurrent);
        if (isCurrent) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    }

    function advanceGallery(direction) {
      if (!visibleGallery.length) return;
      const position = visibleGallery.indexOf(galleryIndex);
      const next = ((position + direction) % visibleGallery.length + visibleGallery.length) % visibleGallery.length;
      showGalleryImage(visibleGallery[next]);
    }

    function openGallery(index, trigger) {
      if (!gallery.length) return;
      filterGallery('');
      showGalleryImage(index);
      openDialog(galleryDialog, trigger);
    }

    document.querySelectorAll('[data-open-gallery]').forEach(function (button) {
      button.addEventListener('click', function () { openGallery(0, button); });
    });
    document.querySelectorAll('[data-gallery-prev]').forEach(function (button) {
      button.addEventListener('click', function () { advanceGallery(-1); });
    });
    document.querySelectorAll('[data-gallery-next]').forEach(function (button) {
      button.addEventListener('click', function () { advanceGallery(1); });
    });
    if (galleryDialog) {
      galleryDialog.addEventListener('keydown', function (event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          advanceGallery(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
    }
    if (galleryImage) {
      galleryImage.addEventListener('touchstart', function (event) {
        touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      }, { passive: true });
      galleryImage.addEventListener('touchend', function (event) {
        if (!touchStart || !event.changedTouches.length) return;
        const deltaX = event.changedTouches[0].clientX - touchStart.x;
        const deltaY = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) advanceGallery(deltaX < 0 ? 1 : -1);
        touchStart = null;
      }, { passive: true });
      galleryImage.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });
    }

    // Navigation and motion stay progressive: content is visible without JS,
    // reveal observers run once, and scroll work shares one animation frame.
    const revealItems = Array.from(document.querySelectorAll('.reveal'));
    if (!motionPreference.matches && 'IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
      revealItems.forEach(function (item) {
        item.classList.add('will-reveal');
        revealObserver.observe(item);
      });
    }

    function hashTarget(hash) {
      if (!hash || hash === '#') return null;
      try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
      catch (error) { return null; }
    }

    function revealHashTarget() {
      const target = hashTarget(window.location.hash);
      if (!target) return;
      if (target.classList.contains('reveal')) target.classList.add('is-visible');
      target.querySelectorAll('.reveal').forEach(function (item) { item.classList.add('is-visible'); });
    }
    window.addEventListener('hashchange', revealHashTarget);
    revealHashTarget();

    const navLinks = Array.from(document.querySelectorAll('#site-header nav a[href^="#"], #mobile-menu nav a[href^="#"]'));
    const navSections = Array.from(new Set(navLinks.map(function (link) { return hashTarget(link.getAttribute('href')); }).filter(Boolean)));

    function synchronizeScroll() {
      scrollPending = false;
      const offset = window.scrollY || 0;
      if (header) header.classList.toggle('is-scrolled', offset > 28);
      root.style.setProperty('--hero-shift', !motionPreference.matches && desktopMedia.matches ? Math.min(offset * 0.14, 90) + 'px' : '0px');
      if (stickyBar) {
        const boundary = heroForm || document.getElementById('home');
        const visible = Boolean(boundary && boundary.getBoundingClientRect().bottom < 0 && !currentDialog());
        stickyBar.classList.toggle('is-visible', visible);
        stickyBar.setAttribute('aria-hidden', String(!visible));
        stickyBar.inert = !visible;
      }
      const headerHeight = header ? header.getBoundingClientRect().height : 80;
      let active = navSections[0] || null;
      navSections.forEach(function (section) { if (section.getBoundingClientRect().top <= headerHeight + 90) active = section; });
      navLinks.forEach(function (link) {
        const isActive = Boolean(active && hashTarget(link.getAttribute('href')) === active);
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function scheduleScrollUpdate() {
      if (scrollPending) return;
      scrollPending = true;
      window.requestAnimationFrame(synchronizeScroll);
    }

    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', function () {
      if (desktopMedia.matches && mobileMenu && mobileMenu.open) closeDialog(mobileMenu);
      scheduleScrollUpdate();
    }, { passive: true });
    motionPreference.addEventListener('change', function () {
      if (motionPreference.matches) revealItems.forEach(function (item) { item.classList.add('is-visible'); });
      scheduleScrollUpdate();
    });
    synchronizeScroll();

    document.querySelectorAll('[data-back-to-top], #back-to-top').forEach(function (button) {
      button.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: motionPreference.matches ? 'instant' : 'smooth' }); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}());
