const statusEl = document.getElementById('status');
const restaurantListEl = document.getElementById('restaurantList');
const searchInput = document.getElementById('search');
const findBtn = document.getElementById('findBtn');
const categoryButtons = document.querySelectorAll('.category-btn');
const API_BASE = window.location.origin === 'null' ? 'http://localhost:3000' : window.location.origin;
let userLocation = null;
let activeCategory = null;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function renderList(restaurants) {
  if (!restaurants.length) {
    restaurantListEl.innerHTML = '<div class="status">No restaurants found matching your search.</div>';
    return;
  }

  restaurantListEl.innerHTML = restaurants
    .map((restaurant) => {
      const distance = userLocation
        ? getDistanceMiles(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng).toFixed(1)
        : null;

      return `
        <article class="restaurant-card">
          <img src="${restaurant.photo}" alt="${restaurant.name} photo" />
          <div class="restaurant-content">
            <div class="restaurant-header">
              <div>
                <h2>${restaurant.name}</h2>
                <div class="restaurant-meta">${restaurant.cuisine} · ${restaurant.address}</div>
              </div>
              <div class="restaurant-meta">⭐ ${restaurant.rating.toFixed(1)}${distance ? ` · ${distance} mi` : ''}</div>
            </div>
            <div class="tags">
              <span class="tag">Top-rated 4.5+</span>
              <span class="tag">${restaurant.cuisine}</span>
            </div>
            <div class="dishes">
              ${restaurant.dishes
                .map(
                  (dish) => `
                    <div class="dish">
                      <img src="${dish.image}" alt="${dish.name}" />
                      <div class="dish-info">
                        <h3>${dish.name}</h3>
                      </div>
                    </div>
                  `
                )
                .join('')}
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function setStatus(message) {
  statusEl.textContent = message;
}

async function fetchRestaurants(query = '', location = null) {
  const params = new URLSearchParams();
  params.set('term', query || 'restaurants');

  if (location) {
    params.set('lat', location.lat);
    params.set('lng', location.lng);
  } else {
    params.set('lat', '47.6062');
    params.set('lng', '-122.3321');
  }

  const response = await fetch(`${API_BASE}/api/restaurants?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Restaurant API request failed');
  }

  return response.json();
}

async function updateRestaurants() {
  const query = searchInput.value.trim();

  try {
    setStatus('Loading restaurants...');
    const data = await fetchRestaurants(query, userLocation);

    if (!data.restaurants?.length) {
      restaurantListEl.innerHTML = '<div class="status">No restaurants found matching your search.</div>';
      setStatus('No restaurants found.');
      return;
    }

    renderList(data.restaurants);
    setStatus(`Showing top-rated restaurants from Google Places rated 4.5+ ${userLocation ? 'near you' : 'in Seattle'}`);
  } catch (error) {
    console.error(error);
    restaurantListEl.innerHTML = `<div class="status">${error.message}</div>`;
    setStatus('Unable to load restaurants. Check the server and API key.');
  }
}

function requestLocation() {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by your browser. Showing restaurants from the default city.');
    updateRestaurants();
    return;
  }

  setStatus('Locating nearby restaurants...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setStatus('Showing nearby restaurants rated 4.5+');
      updateRestaurants();
    },
    (error) => {
      console.warn(error);
      setStatus('Location permission denied or unavailable. Showing popular restaurants.');
      updateRestaurants();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function setActiveCategory(category) {
  categoryButtons.forEach(btn => btn.classList.remove('active'));
  if (category) {
    const btn = document.querySelector(`[data-category="${category}"]`);
    if (btn) btn.classList.add('active');
  }
  activeCategory = category;
}

function handleCategoryClick(event) {
  const category = event.target.dataset.category;
  searchInput.value = category;
  setActiveCategory(category);
  updateRestaurants();
}

searchInput.addEventListener('input', () => {
  setActiveCategory(null);
  updateRestaurants();
});
findBtn.addEventListener('click', requestLocation);

categoryButtons.forEach(btn => btn.addEventListener('click', handleCategoryClick));

window.addEventListener('DOMContentLoaded', updateRestaurants);

