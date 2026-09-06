(function () {
  'use strict';

  const defaults = {
    airbnbURL: '', siteURL: '',
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

  function safeAirbnbURL(value) {
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return '';
    const source = value.trim();
    if (!/^https:\/\//i.test(source)) return '';
    try {
      const url = new URL(source);
      const domains = [
        'airbnb.com', 'airbnb.com.ph', 'airbnb.co.uk', 'airbnb.com.au',
        'airbnb.co.nz', 'airbnb.ca', 'airbnb.fr', 'airbnb.de', 'airbnb.es',
        'airbnb.it', 'airbnb.pt', 'airbnb.at', 'airbnb.be', 'airbnb.ch',
        'airbnb.nl', 'airbnb.ie', 'airbnb.dk', 'airbnb.no', 'airbnb.se',
        'airbnb.fi', 'airbnb.is', 'airbnb.gr', 'airbnb.pl', 'airbnb.cz',
        'airbnb.hu', 'airbnb.jp', 'airbnb.co.kr', 'airbnb.co.in',
        'airbnb.co.id', 'airbnb.com.my', 'airbnb.com.sg', 'airbnb.com.hk',
        'airbnb.com.tw', 'airbnb.com.br', 'airbnb.mx', 'airbnb.cl',
        'airbnb.com.co', 'airbnb.com.pe', 'airbnb.co.za', 'airbnb.com.tr'
      ];
      const host = url.hostname.replace(/^www\./, '');
      return url.protocol === 'https:' && !url.username && !url.password && !url.port && domains.includes(host) ? url.href : '';
    } catch (error) { return ''; }
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
    config.airbnbURL = safeAirbnbURL(configured.airbnbURL);
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
    const bookingStrip = document.getElementById('hero-booking-bar');
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
    let toastTimer;
    let scrollPending = false;
    let galleryIndex = 0;
    let touchStart = null;

    function hydrateProperty() {
      document.querySelectorAll('[data-property]').forEach(function (element) {
        const key = element.dataset.property;
        if (['parkingPrice', 'poolPrice'].includes(key)) element.textContent = '₱' + config[key].toLocaleString('en-PH', { maximumFractionDigits: 2 });
        else if (['maximumGuests', 'bedrooms'].includes(key)) element.textContent = String(config[key]);
        else if (['checkInTime', 'checkOutTime'].includes(key)) element.textContent = readableTime(config[key]);
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
        } catch (error) {  }
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

    function showToast(message) {
      if (!toast) return;
      window.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('is-visible');
      toastTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 6500);
    }

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

    const airbnbStatus = document.getElementById('airbnb-link-status');
    const unavailableMessage = 'Airbnb listing link has not been configured yet.';
    if (airbnbStatus) {
      airbnbStatus.textContent = config.airbnbURL ? '' : unavailableMessage;
      airbnbStatus.hidden = Boolean(config.airbnbURL);
    }
    document.querySelectorAll('a[data-airbnb-link]').forEach(function (link) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (config.airbnbURL) {
        link.href = config.airbnbURL;
        link.removeAttribute('aria-disabled');
        link.removeAttribute('role');
        link.removeAttribute('tabindex');
      } else {
        link.removeAttribute('href');
        link.setAttribute('role', 'link');
        link.tabIndex = 0;
        link.setAttribute('aria-disabled', 'true');
      }
      link.addEventListener('click', function (event) {

        if (mobileMenu && mobileMenu.open && mobileMenu.contains(link)) closeDialog(mobileMenu);
        if (!config.airbnbURL) {
          event.preventDefault();
          showToast(unavailableMessage);
        }
      });
      link.addEventListener('keydown', function (event) {
        if (!config.airbnbURL && event.key === 'Enter') {
          event.preventDefault();
          link.click();
        }
      });
    });

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {  }
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

    document.querySelectorAll('[data-copy-address]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const address = button.dataset.address || button.dataset.copyAddress || 'The Rochester Condominium, Parklane Tower, San Joaquin, Pasig City';
        const copied = await copyText(address);
        showToast(copied ? 'Address copied to your clipboard.' : 'Copy unavailable. Address: ' + address);
      });
    });

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
        const boundary = bookingStrip || document.getElementById('home');
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
