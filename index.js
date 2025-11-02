document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    let currentUserLocation = null;
    let isLoading = false;

    // --- DOM ELEMENTS ---
    const sidebar = document.getElementById('sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const mapIframe = document.getElementById('map-iframe');
    
    // Overlays
    const searchOverlay = document.getElementById('search-overlay');
    const profileOverlay = document.getElementById('profile-overlay');

    // Sidebar/Overlay Buttons
    const menuButtonMap = document.getElementById('menu-button-map');
    const closeSidebarButton = document.getElementById('close-sidebar-button');
    const openSearchMapBtn = document.getElementById('search-button-map');
    const openProfileMapBtn = document.getElementById('profile-button-map');
    const closeSearchBtn = document.getElementById('close-search-overlay');
    const closeProfileBtn = document.getElementById('close-profile-overlay');
    
    // Search
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchRecommendations = document.getElementById('search-recommendations');

    // Profile
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const segmentedControlBg = document.getElementById('segmented-control-bg');
    const nameField = document.getElementById('name-field');
    const authSubmitBtn = document.getElementById('auth-submit-button');
    const authForm = document.getElementById('auth-form');

    // Map actions
    const recenterMapButton = document.getElementById('recenter-map-button');

    // --- CONSTANTS ---
    const filterPills = ['Coffee Shops', 'Libraries', 'Coworking', 'Free Wi-Fi', 'Quiet Places'];
    const featuredPlaces = [
        { name: 'Artisan Roast Cafe', query: 'Artisan Roast Cafe with wifi', category: 'Coffee Shop', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=500&auto=format&fit=crop' },
        { name: 'Central City Library', query: 'Central City Library with free wifi', category: 'Library', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=500&auto=format&fit=crop' },
        { name: 'Innovate Coworking Hub', query: 'Innovate Coworking Hub with power outlets', category: 'Coworking Space', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop' }
    ];
    const recommendationPills = ['Quiet cafes with fast Wi-Fi', 'Places to work with power outlets', '24/7 study spots', 'Libraries with free internet', 'Coffee shops nearby'];
    
    const MOCK_PLACES = [
        {
            maps: {
                title: 'The Daily Grind',
                uri: 'https://www.openstreetmap.org/',
                placeAnswerSources: {
                    reviewSnippets: [
                        { text: 'Great coffee and reliable Wi-Fi for working.', author: 'Jane D.' },
                        { text: 'Can get a bit crowded, but the atmosphere is nice.', author: 'John S.' }
                    ]
                }
            }
        },
        {
            maps: {
                title: 'City Central Library',
                uri: 'https://www.openstreetmap.org/',
                placeAnswerSources: {
                    reviewSnippets: [
                        { text: 'Very quiet and the internet is super fast and free.', author: 'Alice W.' }
                    ]
                }
            }
        },
        {
            maps: {
                title: 'Co-Work & Create',
                uri: 'https://www.openstreetmap.org/',
                placeAnswerSources: {
                    reviewSnippets: []
                }
            }
        }
    ];

    // --- RENDERING ---
    const renderSpinner = () => `
        <div class="flex flex-col items-center justify-center h-full space-y-2">
            <svg class="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-zinc-400">Searching...</p>
        </div>`;
    
    const renderError = (message) => `<div class="text-red-400 bg-red-900/30 p-3 rounded-lg">${message}</div>`;
    const renderApiError = (message) => `<div class="text-yellow-400 bg-yellow-900/30 p-3 rounded-lg">${message}</div>`;

    const renderLocationCard = (place) => `
        <div class="bg-zinc-800 p-4 rounded-xl border border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-700/50 transition-all group">
            <div class="flex justify-between items-start">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 pt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div><h3 class="font-semibold text-gray-100">${place.title}</h3></div>
                </div>
                <a href="${place.uri}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-full text-zinc-400 group-hover:text-blue-400 group-hover:bg-zinc-600/50 transition-colors" aria-label="Open in Maps">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002 2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
            ${(place.placeAnswerSources?.reviewSnippets || []).slice(0, 2).map(snippet => `
                <div class="mt-3 pl-8 border-l-2 border-zinc-600 pl-3">
                    <p class="text-sm text-zinc-300 italic">"${snippet.text}"</p>
                    <p class="text-xs text-zinc-400 text-right mt-1">- ${snippet.author}</p>
                </div>
            `).join('')}
        </div>`;

    const renderResults = (result) => {
        let html = '<div class="space-y-4">';
        if (result.summary) {
            html += `<div class="bg-zinc-800 p-4 rounded-xl"><p class="text-zinc-300">${result.summary}</p></div>`;
        }
        if (result.places.length > 0) {
            html += result.places.map(place => renderLocationCard(place.maps)).join('');
        } else {
            html += `<div class="text-center text-zinc-400 p-4"><p>No specific places found. Try a different search.</p></div>`;
        }
        html += '</div>';
        sidebarContent.innerHTML = html;
    };

    const renderInitialView = () => {
        const filtersHTML = filterPills.map(filter =>
            `<button data-query="${filter}" class="filter-pill bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">${filter}</button>`
        ).join('');

        const featuredHTML = featuredPlaces.map(place => `
            <button data-query="${place.query}" class="featured-place w-full text-left rounded-lg overflow-hidden bg-zinc-800 hover:bg-zinc-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group">
                <div class="relative h-24">
                    <img src="${place.image}" alt="${place.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span class="absolute bottom-2 right-2 bg-blue-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">${place.category}</span>
                </div>
                <div class="p-3"><p class="font-semibold text-zinc-100">${place.name}</p></div>
            </button>
        `).join('');

        sidebarContent.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Quick Filters</h3>
                    <div class="flex flex-wrap gap-2">${filtersHTML}</div>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Featured Places</h3>
                    <div class="space-y-3">${featuredHTML}</div>
                </div>
            </div>`;
        
        document.querySelectorAll('.filter-pill, .featured-place').forEach(el => {
            el.addEventListener('click', (e) => executeSearch(e.currentTarget.dataset.query));
        });
    };
    
    const renderSearchRecommendations = () => {
        const container = searchRecommendations.querySelector('div');
        container.innerHTML = recommendationPills.map(rec => 
            `<button data-query="${rec}" class="rec-pill bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">${rec}</button>`
        ).join('');
        document.querySelectorAll('.rec-pill').forEach(el => {
            el.addEventListener('click', (e) => {
                const query = e.currentTarget.dataset.query;
                searchInput.value = query;
                executeSearch(query);
            });
        });
    };


    // --- LOGIC ---
    const toggleOverlay = (overlay, show) => {
        if (show) {
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            overlay.setAttribute('aria-hidden', 'false');
        } else {
            overlay.classList.add('opacity-0', 'pointer-events-none');
            overlay.setAttribute('aria-hidden', 'true');
        }
    };

    const toggleSidebar = (show) => {
        if (show) {
            sidebar.classList.remove('-translate-x-full');
        } else {
            sidebar.classList.add('-translate-x-full');
        }
    };

    const updateMap = (location) => {
        const { latitude: lat, longitude: lon } = location;
        const delta = 0.05;
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        const markers = `&marker=${lat},${lon}`;
        mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;
    };

    const handleSearch = (query) => {
        if (!currentUserLocation) {
            sidebarContent.innerHTML = renderError("Could not get your location. Please enable location services and try again.");
            return;
        }
        isLoading = true;
        sidebarContent.innerHTML = renderSpinner();
        
        // Simulate a network request with a timeout
        setTimeout(() => {
            const mockResult = {
                summary: `Showing results for "${query}". This is mock data for demonstration.`,
                places: MOCK_PLACES
            };
            renderResults(mockResult);
            isLoading = false;
        }, 1000);
    };

    const executeSearch = (query) => {
        if (window.innerWidth < 768) { // Tailwind's 'md' breakpoint
            toggleSidebar(false);
        }
        toggleOverlay(searchOverlay, false);
        // Add a small delay for sidebar animation to complete before starting search
        setTimeout(() => handleSearch(query), 300);
    };

    // --- INITIALIZATION & EVENT LISTENERS ---
    
    // Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentUserLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                updateMap(currentUserLocation);
                renderInitialView();
            },
            (error) => {
                console.error("Geolocation error:", error);
                sidebarContent.innerHTML = renderError(`Error: ${error.message}. Please enable location services.`);
                // Use a default location for the map
                updateMap({ latitude: 18.5204, longitude: 73.8567 });
                renderInitialView();
            }
        );
    } else {
        sidebarContent.innerHTML = renderError("Geolocation is not supported by this browser.");
        updateMap({ latitude: 18.5204, longitude: 73.8567 });
        renderInitialView();
    }
    
    // Sidebar and Overlay toggles
    menuButtonMap.addEventListener('click', () => toggleSidebar(true));
    closeSidebarButton.addEventListener('click', () => toggleSidebar(false));
    [openSearchMapBtn, closeSearchBtn].forEach(el => el.addEventListener('click', () => toggleOverlay(searchOverlay, !searchOverlay.classList.contains('opacity-0'))));
    [openProfileMapBtn, closeProfileBtn].forEach(el => el.addEventListener('click', () => toggleOverlay(profileOverlay, !profileOverlay.classList.contains('opacity-0'))));

    searchOverlay.addEventListener('transitionend', () => {
      if (!searchOverlay.classList.contains('opacity-0')) {
        searchInput.focus();
      }
    });

    // Search form
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            executeSearch(query);
        }
    });

    // Profile form segmented control
    loginTab.addEventListener('click', () => {
        segmentedControlBg.style.transform = 'translateX(0%)';
        loginTab.classList.remove('text-zinc-400');
        loginTab.classList.add('text-zinc-100');
        signupTab.classList.add('text-zinc-400');
        signupTab.classList.remove('text-zinc-100');
        nameField.classList.add('hidden');
        nameField.querySelector('input').required = false;
        authSubmitBtn.textContent = 'Sign In';
    });

    signupTab.addEventListener('click', () => {
        segmentedControlBg.style.transform = 'translateX(100%)';
        signupTab.classList.remove('text-zinc-400');
        signupTab.classList.add('text-zinc-100');
        loginTab.classList.add('text-zinc-400');
        loginTab.classList.remove('text-zinc-100');
        nameField.classList.remove('hidden');
        nameField.querySelector('input').required = true;
        authSubmitBtn.textContent = 'Create Account';
    });
    
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Auth form submitted.');
        toggleOverlay(profileOverlay, false);
    });

    // Map button
    recenterMapButton.addEventListener('click', () => {
        if(currentUserLocation) {
            updateMap(currentUserLocation);
        }
    });

    // Initial Renders
    renderInitialView();
    renderSearchRecommendations();
});