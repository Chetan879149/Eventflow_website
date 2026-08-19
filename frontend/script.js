window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${iconClass} toast-icon"></i><div class="toast-content">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', async () => {
    // index.html is the authenticated application page.
    const me = await window.authApi?.getMe?.();
    if (!me?.ok || !me.user) {
        try { await window.authApi?.logout?.(); } catch {}
        window.location.href = '/login.html';
        return;
    }

    // Prevent running via file:// because API calls like /api/events will fail.
    if (window.location && window.location.protocol === 'file:') {
        window.showToast('Open this page using http://localhost:3000 (not directly from the file system).', 'error');
        return;
    }

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    const mobileMenu = document.getElementById('mobileMenu');
    const navbar = document.getElementById('navbar');
    const eventsGrid = document.getElementById('eventsGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const counters = document.querySelectorAll('.counter');
    const pricingToggle = document.getElementById('pricingToggle');
    const contactForm = document.getElementById('contactForm');
    const createEventForm = document.getElementById('createEventForm');
    const loginForm = document.querySelector('#loginModal form');
    const registerForm = document.querySelector('#registerModal form');
    const eventDetailModal = document.getElementById('eventDetailModal');
    // bookingForm may not exist in every index.html version
    const bookingForm = document.getElementById('bookingForm');

    const bookingEventIdInput = document.getElementById('bookingEventId');
    const bookingAttendeeNameInput = document.getElementById('bookingAttendeeName');
    const bookingAttendeeEmailInput = document.getElementById('bookingAttendeeEmail');
    const bookingTicketQuantityInput = document.getElementById('bookingTicketQuantity');
    const guestAuthButtons = document.getElementById('guestAuthButtons');
    const signedInAuthArea = document.getElementById('signedInAuthArea');
    const authStatusText = document.getElementById('authStatusText');
    const mobileGuestAuthButtons = document.getElementById('mobileGuestAuthButtons');
    const mobileSignedInAuthArea = document.getElementById('mobileSignedInAuthArea');
    const mobileAuthStatusText = document.getElementById('mobileAuthStatusText');
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    const bookingCardNumberInput = document.getElementById('bookingCardNumber');
    const bookingCardExpiryInput = document.getElementById('bookingCardExpiry');
    const bookingCardCvcInput = document.getElementById('bookingCardCvc');

    let currentBookingEvent = null;
    let currentUser = null;

    const FREE_PAYMENT_API_KEY = 'pk_test_eventflow_free_demo';

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const defaultEventImages = {
        conference: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop',
        music: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=250&fit=crop',
        workshop: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=400&h=250&fit=crop',
        sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=250&fit=crop',
        other: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=250&fit=crop'
    };

    const getInputValue = (form, selector) => {
        const input = form ? form.querySelector(selector) : null;
        return input ? input.value.trim() : '';
    };

    const apiRequest = async (url, method, body) => {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        // Try JSON first, then fallback to text to avoid losing error messages.
        const payload = await response.json().catch(() => null);
        const textPayload = payload === null ? await response.text().catch(() => '') : '';

        if (!response.ok) {
            const msg = payload?.error || payload?.message || textPayload || 'Something went wrong.';
            throw new Error(String(msg));
        }

        return payload ?? {};
    };

    const readStoredUser = () => {
        try {
            const storedUser = localStorage.getItem('eventflow-user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            return null;
        }
    };

    const persistAuthState = (user, token) => {
        currentUser = user || null;

        if (token) {
            localStorage.setItem('eventflow-session', token);
        }

        if (user) {
            localStorage.setItem('eventflow-user', JSON.stringify(user));
        }

        renderAuthState();
    };

    const clearAuthState = () => {
        currentUser = null;
        // Clear both persistent and session authentication state.
        try {
            localStorage.removeItem('eventflow-session');
            localStorage.removeItem('eventflow-user');
            sessionStorage.removeItem('eventflow-session');
        } catch (_) {}
        renderAuthState();
    };

    // Logout must always return the user to the Login page.
    // The server logout is best-effort; the client state is cleared even if
    // the server request fails.
    const logoutAndRedirectToLogin = async () => {
        try {
            if (window.authApi?.logout) {
                await window.authApi.logout();
            } else {
                clearAuthState();
            }
        } catch (_) {
            clearAuthState();
        }

        window.location.replace('/login.html');
    };

    const isUserLoggedIn = () => Boolean(currentUser || readStoredUser());

    const requireLoginForModal = (modalId) => {
        if (isUserLoggedIn()) {
            return true;
        }

        showToast('Please sign in to continue.', 'error');
        window.openModal('loginModal');
        return false;
    };

    const setPricingAccess = (isLoggedIn) => {
        const pricingAuthHint = document.getElementById('pricingAuthHint');

        if (pricingToggle) {
            pricingToggle.disabled = !isLoggedIn;
            pricingToggle.classList.toggle('opacity-50', !isLoggedIn);
            pricingToggle.classList.toggle('cursor-not-allowed', !isLoggedIn);
            pricingToggle.title = isLoggedIn ? 'Toggle billing period' : 'Sign in to choose a plan';
        }

        document.querySelectorAll('[data-open-modal="paymentModal"]').forEach(btn => {
            btn.disabled = !isLoggedIn;
            btn.classList.toggle('opacity-50', !isLoggedIn);
            btn.classList.toggle('cursor-not-allowed', !isLoggedIn);
            btn.title = isLoggedIn ? 'Start Free Trial' : 'Sign in to choose a plan';
        });

        if (pricingAuthHint) {
            pricingAuthHint.classList.toggle('hidden', isLoggedIn);
        }
    };

    const closeNavDropdown = () => {
        const navUserDropdown = document.getElementById('navUserDropdown');
        if (navUserDropdown) {
            navUserDropdown.classList.add('hidden');
        }
    };

    document.addEventListener('click', (event) => {
        const target = event.target;
        const insideNavUserBtn = target instanceof Node && target.closest('#navUserInitialBtn');
        const insideNavUserDropdown = target instanceof Node && target.closest('#navUserDropdown');

        if (!insideNavUserBtn && !insideNavUserDropdown) {
            closeNavDropdown();
        }
    });

    const renderAuthState = () => {
        const storedUser = currentUser || readStoredUser();
        const isLoggedIn = Boolean(storedUser);

        const firstName = storedUser?.firstName || storedUser?.first_name || '';
        const lastName = storedUser?.lastName || storedUser?.last_name || '';

        const toTitleCase = (s) => String(s || '')
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());

        const firstLetter = firstName ? String(firstName).trim().charAt(0).toUpperCase() : '';
        const titleSurname = lastName ? toTitleCase(lastName).replace(/^\s+|\s+$/g, '') : '';

        const formattedName = firstLetter && titleSurname ? `${firstLetter} ${titleSurname}` : toTitleCase(firstName || storedUser?.email || 'User');
        const signedInText = `Signed in as ${formattedName}`;

        // Desktop auth buttons: hide only the Sign In button when logged in
        const signInBtn = document.getElementById('signInBtn');
        if (signInBtn) signInBtn.classList.toggle('hidden', isLoggedIn);

        // Mobile auth buttons: hide only the Sign In button when logged in
        const mobileSignInBtn = document.getElementById('mobileSignInBtn');
        const authGuestButtonsMobileEl = document.getElementById('authGuestButtonsMobile');
        const authSignedInButtonsMobileEl = document.getElementById('authSignedInButtonsMobile');
        if (mobileSignInBtn) mobileSignInBtn.classList.toggle('hidden', isLoggedIn);
        if (authGuestButtonsMobileEl) authGuestButtonsMobileEl.classList.remove('hidden');
        if (authSignedInButtonsMobileEl) authSignedInButtonsMobileEl.classList.toggle('hidden', !isLoggedIn);

        // Keep existing text if present
        if (authStatusText) authStatusText.textContent = signedInText;

        // Navbar user menu (shown only when logged in)
        const navUserMenu = document.getElementById('navUserMenu');
        const navUserInitialBtn = document.getElementById('navUserInitialBtn');
        const navUserInitial = document.getElementById('navUserInitial');
        const navUserDropdown = document.getElementById('navUserDropdown');
        const navProfileBtn = document.getElementById('navProfileBtn');
        const navLogoutBtn = document.getElementById('navLogoutBtn');

        if (navUserMenu) navUserMenu.classList.toggle('hidden', !isLoggedIn);
        if (navUserInitial) navUserInitial.textContent = firstLetter || 'U';

        // Dropdown toggle when clicking the initial button
        if (navUserInitialBtn) {
            navUserInitialBtn.onclick = (e) => {
                e.stopPropagation();
                if (!navUserDropdown) return;
                navUserDropdown.classList.toggle('hidden');
            };
        }

        // Open profile modal
        if (navProfileBtn) {
            navProfileBtn.onclick = (e) => {
                e.stopPropagation();
                window.openModal('profileModal');
                if (navUserDropdown) navUserDropdown.classList.add('hidden');
            };
        }

        // Logout from dropdown
        if (navLogoutBtn) {
            navLogoutBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = window.confirm('Are you sure you want to logout?');
                if (!confirmed) return;

                if (navUserDropdown) navUserDropdown.classList.add('hidden');
                await logoutAndRedirectToLogin();
            };
        }

        const mobileProfileBtn = document.getElementById('mobileProfileBtn');
        const authSignedInButtonsMobile = document.getElementById('authSignedInButtonsMobile');

        if (authSignedInButtonsMobile) authSignedInButtonsMobile.classList.toggle('hidden', !isLoggedIn);
        if (mobileProfileBtn) {
            mobileProfileBtn.onclick = () => {
                window.openModal('profileModal');
            };
        }

        setPricingAccess(isLoggedIn);

        const profileEmailEl = document.getElementById('profileEmail');
        const profileEmailDetailEl = document.getElementById('profileEmailDetail');
        const profileMemberSinceEl = document.getElementById('profileMemberSince');
        const profileUsernameEl = document.getElementById('profileUsername');
        const profilePhoneEl = document.getElementById('profilePhone');
        const profileLocationEl = document.getElementById('profileLocation');
        const profilePlanEl = document.getElementById('profilePlan');

        const username = storedUser?.username || storedUser?.userName || storedUser?.handle || storedUser?.nickname || 'Not available';
        const phone = storedUser?.phone || storedUser?.phoneNumber || storedUser?.tel || 'Not available';
        const location = storedUser?.location || storedUser?.city || storedUser?.country || 'Not available';
        const plan = storedUser?.plan || storedUser?.membershipPlan || storedUser?.subscription || JSON.parse(localStorage.getItem('trialPlan') || '{}')?.plan || 'Free';

        if (profileEmailEl) profileEmailEl.textContent = storedUser?.email || 'No email available';
        if (profileEmailDetailEl) profileEmailDetailEl.textContent = storedUser?.email || 'No email available';
        if (profileMemberSinceEl) profileMemberSinceEl.textContent = storedUser?.createdAt || storedUser?.created_at || 'Unknown';
        if (profileUsernameEl) profileUsernameEl.textContent = username;
        if (profilePhoneEl) profilePhoneEl.textContent = phone;
        if (profileLocationEl) profileLocationEl.textContent = location;
        if (profilePlanEl) profilePlanEl.textContent = plan;

        if (bookingAttendeeNameInput && storedUser) {
            bookingAttendeeNameInput.value = [storedUser.firstName || storedUser.first_name || '', storedUser.lastName || storedUser.last_name || '']
                .filter(Boolean)
                .join(' ')
                .trim();
        }

        if (bookingAttendeeEmailInput && storedUser?.email) {
            bookingAttendeeEmailInput.value = storedUser.email;
        }
    };

    const simulateFreePayment = async ({ cardNumber, expiry, cvc, amount }) => {
        await new Promise(resolve => window.setTimeout(resolve, 500));

        if (!FREE_PAYMENT_API_KEY.startsWith('pk_test_')) {
            throw new Error('Demo payment key is not configured.');
        }

        if (!cardNumber || !expiry || !cvc) {
            throw new Error('Please complete the payment fields to confirm booking.');
        }

        return {
            id: `pay_${Date.now()}`,
            status: 'succeeded',
            amount
        };
    };

    const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

    const getCardText = (card, selector) => card?.querySelector(selector)?.textContent.trim() || '';

    const getEventField = (card, datasetKey, selector) => {
        if (card?.dataset?.[datasetKey]) {
            return card.dataset[datasetKey];
        }

        return getCardText(card, selector);
    };

    const getLocationFromCard = (card) => {
        if (card?.dataset?.eventLocation) {
            return card.dataset.eventLocation;
        }

        const locationTag = card?.querySelector('.fa-map-marker-alt');
        if (locationTag) {
            const parent = locationTag.closest('.flex.items-center');
            if (parent) {
                const span = parent.querySelector('span:not(.mx-2)');
                if (span) return span.textContent.trim();
            }
        }

        const locationText = card?.querySelector('[data-event-location]');
        if (locationText) return locationText.textContent.trim();

        return '';
    };

    const extractEventFromCard = (card) => {
        if (!card) {
            return null;
        }

        const metaLine = card.querySelector('.text-sm.text-gray-400.mb-3');
        const metaParts = metaLine ? metaLine.textContent.split('•').map(part => part.trim()).filter(Boolean) : [];
        const priceText = getEventField(card, 'eventPrice', '.text-right .gradient-text, .text-right .text-lg.font-bold');

        return {
            id: card.dataset.eventId || '',
            title: getEventField(card, 'eventTitle', 'h3'),
            category: card.dataset.eventCategory || card.dataset.category || getEventField(card, 'eventCategory', '[data-event-category]') || 'other',
            date: card.dataset.eventDate || metaParts[0] || getCardText(card, '.text-sm.text-gray-400.mb-3 span:first-child'),
            time: card.dataset.eventTime || metaParts[1] || getCardText(card, '.text-sm.text-gray-400.mb-3 span:last-child'),
            location: card.dataset.eventLocation || getLocationFromCard(card),
            attendees: card.dataset.eventAttendees || getCardText(card, '.text-sm.text-gray-400 span.text-gray-300, .text-sm.text-gray-400 span:not(.mx-2)'),
            description: getEventField(card, 'eventDescription', 'p.text-gray-400.text-sm.mb-4, p.line-clamp-2'),
            priceText,
            priceValue: Number(String(priceText).replace(/[^0-9.]/g, '')) || 0,
            image: card.dataset.eventImage || card.querySelector('img')?.src || defaultEventImages.other
        };
    };

    const setEventDetailValue = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    const toTitleCase = (text) => String(text || '')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    const populateEventDetailModal = async (card) => {
        const eventData = extractEventFromCard(card);

        if (!eventData) {
            return;
        }

        currentBookingEvent = eventData;

        const eventDetailImage = document.getElementById('eventDetailImage');
        if (eventDetailImage) {
            eventDetailImage.src = eventData.image;
            eventDetailImage.alt = eventData.title || 'Event';
        }

        setEventDetailValue('eventDetailCategory', toTitleCase(eventData.category || 'other'));
        setEventDetailValue('eventDetailTitle', eventData.title || 'Untitled Event');
        setEventDetailValue('eventDetailDate', eventData.date || 'Date to be announced');
        setEventDetailValue('eventDetailTime', eventData.time || 'Time to be announced');
        setEventDetailValue('eventDetailLocation', eventData.location || 'Location to be announced');
        setEventDetailValue('eventDetailAttendees', eventData.attendees || 'Registration details will appear here');
        setEventDetailValue('eventDetailDescription', eventData.description || 'No description provided.');
        setEventDetailValue('eventDetailPrice', eventData.priceText || '$0');

        const bookingSummary = document.getElementById('bookingEventSummary');
        const bookingTotalPrice = document.getElementById('bookingTotalPrice');
        if (bookingSummary) {
            bookingSummary.textContent = `${eventData.title || 'Event'} • ${eventData.date || 'Date TBD'} • ${eventData.location || 'Location TBD'}`;
        }
        if (bookingTotalPrice) {
            bookingTotalPrice.textContent = eventData.priceText || '$0';
        }

        if (bookingEventIdInput) {
            bookingEventIdInput.value = eventData.id || '';
        }

        if (bookingTicketQuantityInput) {
            const updateBookingTotal = () => {
                const qty = Number(bookingTicketQuantityInput.value) || 1;
                const base = Number(String(eventData.priceText || '0').replace(/[^0-9.]/g, '')) || 0;
                if (bookingTotalPrice) {
                    bookingTotalPrice.textContent = base > 0 ? `$${(base * qty).toFixed(2)}` : 'Free';
                }
            };

            bookingTicketQuantityInput.removeEventListener('input', updateBookingTotal);
            bookingTicketQuantityInput.addEventListener('input', updateBookingTotal);
        }

        try {
            const resolvedEventId = await resolveBookingEventId();
            if (resolvedEventId && bookingEventIdInput) {
                bookingEventIdInput.value = String(resolvedEventId);
                currentBookingEvent.id = String(resolvedEventId);
            }
        } catch (error) {
            console.warn('Unable to resolve event for booking:', error.message);
        }
    };

    const resolveBookingEventId = async () => {
        if (!currentBookingEvent) {
            return '';
        }

        const events = await apiRequest('/api/events', 'GET');
        if (!Array.isArray(events)) {
            return '';
        }

        if (currentBookingEvent.id) {
            const existingEvent = events.find(item => String(item.id) === String(currentBookingEvent.id));
            if (existingEvent) {
                return String(existingEvent.id);
            }
        }

        const match = events.find(item => {
            const sameTitle = normalizeText(item.title) === normalizeText(currentBookingEvent?.title);
            const sameCategory = normalizeText(item.category) === normalizeText(currentBookingEvent?.category);
            const sameLocation = normalizeText(item.location) === normalizeText(currentBookingEvent?.location);

            return sameTitle && sameCategory && sameLocation;
        });

        if (match) {
            currentBookingEvent.id = String(match.id);
            if (bookingEventIdInput) {
                bookingEventIdInput.value = String(match.id);
            }
            return String(match.id);
        }

        return '';
    };

    const formatDate = (value) => {
        if (!value) {
            return 'Date to be announced';
        }

        const parsedDate = new Date(`${value}T00:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(value);
        }

        return parsedDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (value) => {
        if (!value) {
            return 'Time to be announced';
        }

        const parsedTime = new Date(`1970-01-01T${value}`);

        if (Number.isNaN(parsedTime.getTime())) {
            return String(value);
        }

        return parsedTime.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getEventImage = (event) => {
        const imagePath = event?.image_path || event?.imagePath || '';

        if (imagePath && /^(https?:)?\/\//.test(imagePath)) {
            return imagePath;
        }

        return defaultEventImages[String(event?.category || 'other').toLowerCase()] || defaultEventImages.other;
    };

    const createEventCard = (event) => {
        const card = document.createElement('div');
        const category = String(event?.category || 'other').toLowerCase();
        const price = Number(event?.ticket_price ?? event?.ticketPrice ?? 0);
        const priceLabel = price > 0 ? `$${price.toFixed(2)}` : 'Free';
        const organizerName = [event?.first_name || event?.firstName, event?.last_name || event?.lastName].filter(Boolean).join(' ') || 'Event Organizer';

        card.className = 'event-card glass-card rounded-3xl overflow-hidden hover-lift';
        card.dataset.category = category;
        card.dataset.eventId = event?.id ? String(event.id) : '';
        card.dataset.eventTitle = event?.title || '';
        card.dataset.eventCategory = category;
        card.dataset.eventDate = event?.event_date || event?.eventDate || '';
        card.dataset.eventTime = event?.event_time || event?.eventTime || '';
        card.dataset.eventLocation = event?.location || '';
        card.dataset.eventDescription = event?.description || '';
        card.dataset.eventPrice = priceLabel;
        card.dataset.eventImage = getEventImage(event);
        card.innerHTML = `
            <div class="relative">
                <img src="${escapeHtml(getEventImage(event))}" alt="${escapeHtml(event?.title || 'Event')}" class="w-full h-56 object-cover">
                <div class="absolute top-4 left-4">
                    <span class="px-3 py-1 bg-primary-500 rounded-full text-sm font-medium">${escapeHtml(category)}</span>
                </div>
            </div>
            <div class="p-6 space-y-4">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-bold mb-2">${escapeHtml(event?.title || 'Untitled Event')}</h3>
                        <div class="text-gray-400 text-sm space-y-1">
                            <p><i class="fas fa-calendar mr-2"></i>${escapeHtml(formatDate(event?.event_date || event?.eventDate))}</p>
                            <p><i class="fas fa-clock mr-2"></i>${escapeHtml(formatTime(event?.event_time || event?.eventTime))}</p>
                            <p><i class="fas fa-map-marker-alt mr-2"></i>${escapeHtml(event?.location || 'Location to be announced')}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-2xl font-bold gradient-text">${escapeHtml(priceLabel)}</div>
                        <div class="text-xs text-gray-400 uppercase tracking-[0.2em]">${escapeHtml(organizerName)}</div>
                    </div>
                </div>
                <p class="text-gray-300 text-sm leading-6">${escapeHtml(event?.description || 'No description provided.')}</p>
                <button type="button" data-open-modal="eventDetailModal" class="w-full mt-4 py-3 rounded-xl border border-primary-500 text-primary-400 font-semibold hover:bg-primary-500 hover:text-white transition-all">
                    View Details
                </button>
            </div>
        `;

        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

        return card;
    };

    const refreshEventCards = () => {
        document.querySelectorAll('.glass-card, .event-card').forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    };

    const loadSavedEvents = async () => {
        if (!eventsGrid) {
            return;
        }

        try {
            const events = await apiRequest('/api/events', 'GET');

            if (!Array.isArray(events)) {
                return;
            }

            events.forEach(event => {
                eventsGrid.appendChild(createEventCard(event));
            });

            refreshEventCards();
        } catch (error) {
            console.warn('Unable to load saved events:', error.message);
        }
    };

    window.scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    };

    document.addEventListener('click', (event) => {
        const actionElement = event.target.closest('[data-open-modal], [data-close-modal], [data-scroll-target]');

        if (!actionElement) {
            return;
        }

        if (actionElement.dataset.openModal === 'eventDetailModal') {
            void populateEventDetailModal(actionElement.closest('.event-card'));
        }

        if (actionElement.dataset.closeModal) {
            window.closeModal(actionElement.dataset.closeModal);
        }

        const modalToOpen = actionElement.dataset.openModal;
        if (modalToOpen === 'createEventModal' || modalToOpen === 'bookingModal' || modalToOpen === 'paymentModal') {
            if (!requireLoginForModal(modalToOpen)) {
                return;
            }
        }

        // If opening the payment modal via a Start Free Trial button, store the selected plan and price
        if (actionElement.dataset.openModal === 'paymentModal') {
            try {
                const card = actionElement.closest('.glass-card');
                const monthPriceRaw = (card && card.getAttribute('data-month-price')) || '$0';
                const plan = actionElement.getAttribute('data-plan') || 'trial';
                localStorage.setItem('pendingPlan', JSON.stringify({ plan, price: monthPriceRaw }));

                const planLabel = document.getElementById('paymentPlanLabel');
                if (planLabel) planLabel.textContent = `${plan} — ${monthPriceRaw}`;
                // Ensure payment UI (card fields / PayPal barcode) reflects current selection
                try { if (typeof updatePaymentUI === 'function') updatePaymentUI(); } catch (e) {}
            } catch (e) {
                // ignore
            }
        }

        if (actionElement.dataset.openModal) {
            window.openModal(actionElement.dataset.openModal);
        }

        if (actionElement.dataset.scrollTarget) {
            window.scrollToSection(actionElement.dataset.scrollTarget);
        }
    });

    const showToast = (message, type = 'success') => {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        if (!toast || !toastMessage || !toastIcon) {
            return;
        }

        toastMessage.textContent = message;

        if (type === 'success') {
            toastIcon.className = 'w-8 h-8 rounded-full bg-green-500 flex items-center justify-center';
            toastIcon.innerHTML = '<i class="fas fa-check"></i>';
        } else if (type === 'error') {
            toastIcon.className = 'w-8 h-8 rounded-full bg-red-500 flex items-center justify-center';
            toastIcon.innerHTML = '<i class="fas fa-times"></i>';
        }

        toast.classList.remove('hidden');

        window.setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    };

    window.showToast = showToast;

    if (mobileMenuBtn && mobileMenu) {
        const syncMobileMenuIcon = () => {
            const icon = mobileMenuBtn.querySelector('i');
            if (!icon) {
                return;
            }

            const isOpen = !mobileMenu.classList.contains('hidden');
            icon.classList.toggle('fa-bars', !isOpen);
            icon.classList.toggle('fa-times', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
        };

        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            syncMobileMenuIcon();
        });

        document.querySelectorAll('#mobileMenu a, #mobileMenu button').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                syncMobileMenuIcon();
            });
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            const insideMobileMenu = target instanceof Node && target.closest('#mobileMenu');
            const insideMobileToggle = target instanceof Node && target.closest('#mobileMenuBtn');

            if (!insideMobileMenu && !insideMobileToggle && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                syncMobileMenuIcon();
            }
        });
    }

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 50) {
                navbar.classList.add('glass-card', 'py-2');
            } else {
                navbar.classList.remove('glass-card', 'py-2');
            }
        });
    }

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.fixed.z-50:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            });
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(button => button.classList.remove('active', 'bg-primary-500'));
            btn.classList.add('active', 'bg-primary-500');

            const filter = btn.dataset.filter;

            document.querySelectorAll('#eventsGrid .event-card').forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                    card.classList.add('animate-fade-in');
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const icon = btn.querySelector('i');

            if (!icon) {
                return;
            }

            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            icon.classList.toggle('text-red-500');

            showToast(icon.classList.contains('fas') ? 'Added to favorites!' : 'Removed from favorites');
        });
    });

    const animateCounter = (counter) => {
        const target = Number(counter.getAttribute('data-target'));
        const count = Number(counter.innerText.replace(/[^0-9]/g, '')) || 0;
        const increment = target / 200;

        if (count < target) {
            counter.innerText = Math.ceil(count + increment);
            window.setTimeout(() => animateCounter(counter), 10);
        } else {
            counter.innerText = `${target}${target === 98 ? '%' : '+'}`;
        }
    };

    if (counters.length > 0) {
        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    counters.forEach(counter => animateCounter(counter));
                    observerInstance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(counters[0].parentElement.parentElement);
    }

    if (pricingToggle) {
        let isAnnual = false;

        const updatePricingDisplay = () => {
            document.querySelectorAll('.glass-card[data-month-price]').forEach(card => {
                const month = card.getAttribute('data-month-price') || '$0';
                const annual = card.getAttribute('data-annual-price') || month;
                const priceEl = card.querySelector('.plan-price');
                const billingEl = card.querySelector('.plan-billing');

                if (priceEl && billingEl) {
                    if (isAnnual) {
                        priceEl.textContent = annual;
                        billingEl.textContent = '/year';
                    } else {
                        priceEl.textContent = month;
                        billingEl.textContent = '/month';
                    }
                }
            });
        };

        pricingToggle.addEventListener('click', () => {
            isAnnual = !isAnnual;
            const toggle = pricingToggle.querySelector('span');

            if (toggle) {
                toggle.style.transform = isAnnual ? 'translateX(28px)' : 'translateX(0)';
            }

            pricingToggle.classList.toggle('bg-primary-500', isAnnual);
            updatePricingDisplay();
        });

        // initialize prices on load
        updatePricingDisplay();
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const firstName = getInputValue(contactForm, '#contactFirstName');
            const lastName = getInputValue(contactForm, '#contactLastName');
            const email = getInputValue(contactForm, '#contactEmail');
            const subject = contactForm.querySelector('#contactSubject')?.value || '';
            const message = getInputValue(contactForm, '#contactMessage');

            try {
                await apiRequest('/api/contact', 'POST', { firstName, lastName, email, subject, message });
                showToast('Message sent successfully!');
                contactForm.reset();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = getInputValue(loginForm, '#loginEmail');
            const password = getInputValue(loginForm, '#loginPassword');
            const firstName = getInputValue(loginForm, '#loginFirstName');
            const lastName = getInputValue(loginForm, '#loginLastName');
            const username = getInputValue(loginForm, '#loginUsername');
            const phone = getInputValue(loginForm, '#loginPhone');
            const location = getInputValue(loginForm, '#loginLocation');

            if (!email || !password) {
                showToast('Enter your email and password.', 'error');
                return;
            }

            try {
                const result = await apiRequest('/api/auth/login', 'POST', { email, password });
                const updatedUser = {
                    ...(result.user || {}),
                    ...(firstName ? { firstName } : {}),
                    ...(lastName ? { lastName } : {}),
                    ...(username ? { username } : {}),
                    ...(phone ? { phone } : {}),
                    ...(location ? { location } : {})
                };

                persistAuthState(updatedUser, result.token);
                loginForm.reset();
                window.closeModal('loginModal');
                showToast(`Welcome back, ${updatedUser.firstName || updatedUser.username || 'User'}!`);
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = getInputValue(resetPasswordForm, '#resetPasswordEmail');

            if (!email) {
                showToast('Please enter your email address.', 'error');
                return;
            }

            try {
                await apiRequest('/api/auth/forgot-password', 'POST', {
                    email
                });

                resetPasswordForm.reset();
                window.closeModal('resetPasswordModal');
                showToast('If that email exists, a reset link has been sent.');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    const resetTokenForm = document.getElementById('resetTokenForm');
    if (resetTokenForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenValue = urlParams.get('token');
        const tokenInput = document.getElementById('resetToken');
        const tokenNotice = document.getElementById('resetTokenNotice');

        if (!tokenValue) {
            if (tokenNotice) {
                tokenNotice.textContent = 'Reset token is missing. Please use the link from your email.';
            }
        } else if (tokenInput) {
            tokenInput.value = tokenValue;
        }

        resetTokenForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const token = getInputValue(resetTokenForm, '#resetToken');
            const newPassword = getInputValue(resetTokenForm, '#resetTokenNewPassword');

            if (!token || !newPassword) {
                showToast('Please enter a new password and use a valid link.', 'error');
                return;
            }

            try {
                await apiRequest('/api/auth/reset-password', 'POST', {
                    token,
                    newPassword
                });

                resetTokenForm.reset();
                showToast('Password updated successfully! You can now sign in.');
                window.location.href = 'index.html';
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const firstName = getInputValue(registerForm, '#registerFirstName');
            const lastName = getInputValue(registerForm, '#registerLastName');
            const username = getInputValue(registerForm, '#registerUsername');
            const phone = getInputValue(registerForm, '#registerPhone');
            const location = getInputValue(registerForm, '#registerLocation');
            const email = getInputValue(registerForm, '#registerEmail');
            const password = getInputValue(registerForm, '#registerPassword');
            const termsAccepted = registerForm.querySelector('#registerTerms')?.checked;

            if (!firstName || !lastName || !email || !password) {
                showToast('Please complete all required fields.', 'error');
                return;
            }

            if (!termsAccepted) {
                showToast('Please accept the terms to continue.', 'error');
                return;
            }

            try {
                const payload = {
                    firstName,
                    lastName,
                    email,
                    password,
                    ...(username ? { username } : {}),
                    ...(phone ? { phone } : {}),
                    ...(location ? { location } : {})
                };

                const result = await apiRequest('/api/auth/register', 'POST', payload);
                const updatedUser = {
                    ...(result.user || {}),
                    firstName,
                    lastName,
                    ...(username ? { username } : {}),
                    ...(phone ? { phone } : {}),
                    ...(location ? { location } : {})
                };

                // Keep user logged in state consistent with login: persist full profile data.
                persistAuthState(updatedUser, null);
                registerForm.reset();
                window.closeModal('registerModal');
                showToast(`Account created for ${updatedUser.firstName || updatedUser.username || 'User'}.`);
                // If a trial plan was selected prior to registration, attach it to the user session
                try {
                    const trialRaw = localStorage.getItem('trialPlan');
                    if (trialRaw) {
                        const trial = JSON.parse(trialRaw);
                        localStorage.removeItem('trialPlan');
                        showToast(`Trial activated: ${trial.plan} (${trial.price})`);
                    }
                } catch (e) {
                    // ignore
                }
            } catch (error) {
                showToast(error.message, 'error');
            }

        });
    }

    // Payment modal handling
    const paymentForm = document.getElementById('paymentForm');
    const updatePaymentUI = () => {
        const form = document.getElementById('paymentForm');
        if (!form) return;
        const method = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';
        const cardFields = document.getElementById('cardFields');
        const paypalBarcode = document.getElementById('paypalBarcode');

        if (cardFields) cardFields.style.display = method === 'card' ? 'block' : 'none';
        if (paypalBarcode) paypalBarcode.style.display = method === 'phonepay' ? 'block' : 'none';

        if (method === 'phonepay') {
            // Generate a demo UPI/PhonePe payload and set QR image src
            try {
                const pending = JSON.parse(localStorage.getItem('pendingPlan') || '{}');
                const amountRaw = pending?.price || '$0';
                const amount = Number(String(amountRaw).replace(/[^0-9.]/g, '')) || 0;
                const plan = pending?.plan || 'trial';
                const upi = `upi://pay?pa=demo%40upi&pn=EventFlow&am=${amount}&tn=${encodeURIComponent(plan + ' trial')}`;
                const qrImg = document.getElementById('paymentQr');
                    if (qrImg) {
                        qrImg.src = `https://chart.googleapis.com/chart?chs=260x260&cht=qr&chl=${encodeURIComponent(upi)}&chld=L|1`;
                        qrImg.style.display = 'block';
                        qrImg.alt = 'PhonePe QR Code';
                    }
            } catch (e) {
                // ignore
            }
        }
    };
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const method = paymentForm.querySelector('input[name="paymentMethod"]:checked')?.value || 'card';
            const pending = JSON.parse(localStorage.getItem('pendingPlan') || '{}');
            const amountRaw = pending?.price || '$0';
            const amount = Number(String(amountRaw).replace(/[^0-9.]/g, '')) || 0;

            try {
                if (method === 'card') {
                    const cardNumber = getInputValue(paymentForm, '#paymentCardNumber');
                    const expiry = getInputValue(paymentForm, '#paymentCardExpiry');
                    const cvc = getInputValue(paymentForm, '#paymentCardCvc');

                    await simulateFreePayment({ cardNumber, expiry, cvc, amount });
                } else if (method === 'phonepay') {
                    // For demo, simulate immediate PhonePe/UPI success (user scans QR externally)
                    await new Promise(res => setTimeout(res, 800));
                }

                // Activate trial locally
                const plan = pending?.plan || 'trial';
                localStorage.setItem('trialPlan', JSON.stringify({ plan, price: amountRaw }));
                localStorage.removeItem('pendingPlan');

                // Persist subscription to server when possible
                try {
                    const payload = { userId: currentUser?.id || 1, plan, price: amountRaw };
                    void apiRequest('/api/subscription', 'POST', payload).catch(() => {});
                } catch (e) {}

                showToast(`Trial activated: ${plan} (${amountRaw})`);
                window.closeModal('paymentModal');
            } catch (err) {
                showToast(err.message || 'Payment failed.', 'error');
            }
        });

        // Toggle card fields based on method
        paymentForm.addEventListener('change', (ev) => {
            updatePaymentUI();
        });
        // Removed simulate-scan button handler — scanning must be done externally via real app
    }

    if (createEventForm) {
        createEventForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isUserLoggedIn()) {
                showToast('Please sign in before creating an event.', 'error');
                window.openModal('loginModal');
                return;
            }

            const title = getInputValue(createEventForm, '#eventName');
            const date = getInputValue(createEventForm, '#eventDate');
            const time = getInputValue(createEventForm, '#eventTime');
            const location = getInputValue(createEventForm, '#eventLocation');
            const category = createEventForm.querySelector('#eventCategory')?.value || '';
            const description = getInputValue(createEventForm, '#eventDescription');
            const ticketPrice = getInputValue(createEventForm, '#ticketPrice');
            const maxAttendees = getInputValue(createEventForm, '#maxAttendees');
            const uploadInput = createEventForm.querySelector('#eventImageInput');

            const imagePath = uploadInput?.files?.[0] ? uploadInput.files[0].name : null;

            try {
                await apiRequest('/api/events', 'POST', {
                    userId: 1,
                    title,
                    date,
                    time,
                    location,
                    category,
                    description,
                    ticketPrice,
                    maxAttendees,
                    imagePath
                });

                if (eventsGrid) {
                    eventsGrid.appendChild(createEventCard({
                        title,
                        event_date: date,
                        event_time: time,
                        location,
                        category,
                        description,
                        ticket_price: ticketPrice,
                        image_path: imagePath,
                        first_name: 'You',
                        last_name: ''
                    }));

                    refreshEventCards();
                }

                showToast('Event created successfully!');
                window.closeModal('createEventModal');
                createEventForm.reset();

                const preview = document.querySelector('[data-upload-preview]');
                const placeholder = document.querySelector('[data-upload-placeholder]');
                const uploadText = document.querySelector('[data-upload-text]');

                if (preview && placeholder && uploadText) {
                    preview.src = '';
                    preview.classList.add('hidden');
                    placeholder.classList.remove('hidden');
                    uploadText.textContent = 'Drop your image here or click to upload';
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isUserLoggedIn()) {
                showToast('Please sign in before booking tickets.', 'error');
                window.openModal('loginModal');
                return;
            }

            if (!currentBookingEvent) {
                showToast('Please select an event first.', 'error');
                return;
            }

            const attendeeName = getInputValue(bookingForm, '#bookingAttendeeName');
            const attendeeEmail = getInputValue(bookingForm, '#bookingAttendeeEmail');
            const ticketQuantity = Number(getInputValue(bookingForm, '#bookingTicketQuantity')) || 1;
            const cardNumber = getInputValue(bookingForm, '#bookingCardNumber');
            const cardExpiry = getInputValue(bookingForm, '#bookingCardExpiry');
            const cardCvc = getInputValue(bookingForm, '#bookingCardCvc');

            if (!attendeeName || !attendeeEmail || !cardNumber || !cardExpiry || !cardCvc) {
                showToast('Please complete the booking form.', 'error');
                return;
            }

            try {
                const totalPrice = (Number(currentBookingEvent.priceValue) || 0) * ticketQuantity;
                await simulateFreePayment({ cardNumber, expiry: cardExpiry, cvc: cardCvc, amount: totalPrice });
                const eventId = await resolveBookingEventId();

                if (!eventId) {
                    showToast('This event is not saved yet, so it cannot be booked.', 'error');
                    return;
                }

                await apiRequest('/api/bookings', 'POST', {
                    userId: currentUser?.id || null,
                    eventId,
                    attendeeName,
                    attendeeEmail,
                    ticketQuantity,
                    totalPrice,
                    paymentId: `pay_${Date.now()}`,
                    paymentStatus: 'succeeded',
                    paymentKey: FREE_PAYMENT_API_KEY
                });

                showToast('Booking confirmed!');
                bookingForm.reset();
                window.closeModal('bookingModal');
                window.closeModal('eventDetailModal');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e?.stopPropagation?.();
            await logoutAndRedirectToLogin();
        });
    }

    // Mobile logout button is not present in the current index.html version.
    // Keep this guarded so it doesn't crash if the element doesn't exist.
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async (e) => {
            e?.stopPropagation?.();

            const dropdown = document.getElementById('authSignedInDropdownMobile');
            if (dropdown) dropdown.classList.add('hidden');

            await logoutAndRedirectToLogin();
        });
    }



    currentUser = readStoredUser();
    renderAuthState();
    loadSavedEvents();

    document.querySelectorAll('input[type="file"]').forEach(input => {
        const wrapper = input.parentElement;
        const preview = wrapper ? wrapper.querySelector('[data-upload-preview]') : null;
        const placeholder = wrapper ? wrapper.querySelector('[data-upload-placeholder]') : null;
        const uploadText = wrapper ? wrapper.querySelector('[data-upload-text]') : null;

        if (!wrapper) {
            return;
        }

        wrapper.addEventListener('click', () => input.click());

        input.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                const fileName = event.target.files[0].name;
                const file = event.target.files[0];

                if (uploadText) {
                    uploadText.textContent = fileName;
                }

                if (placeholder) {
                    placeholder.classList.add('hidden');
                }

                if (preview) {
                    const reader = new FileReader();

                    reader.onload = (loadEvent) => {
                        preview.src = loadEvent.target.result;
                        preview.classList.remove('hidden');
                    };

                    reader.readAsDataURL(file);
                }
            }
        });
    });

    const animateOnScroll = () => {
        document.querySelectorAll('.glass-card, .event-card').forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            if (elementTop < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    document.querySelectorAll('.glass-card, .event-card').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    window.addEventListener('scroll', animateOnScroll);
    window.addEventListener('load', animateOnScroll);
    // window.location.href = '/login.html';
});

