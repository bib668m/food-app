const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PUBLIC_DIR = __dirname;

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('Warning: GOOGLE_PLACES_API_KEY is not set. Google Places API requests will fail.');
}

app.use(cors());
app.use(express.static(PUBLIC_DIR));

async function fetchGoogleRestaurants(latitude, longitude, term) {
  try {
    const params = new URLSearchParams({
      query: term || 'restaurants',
      location: `${parseFloat(latitude)},${parseFloat(longitude)}`,
      radius: '25000',
      type: 'restaurant',
      key: GOOGLE_PLACES_API_KEY,
    });

    const searchResp = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`);
    const searchData = await searchResp.json();

    if (!searchResp.ok || searchData.status !== 'OK') {
      const message = searchData.error_message || searchData.status || 'Google Places search failed';
      throw new Error(message);
    }

    const places = (searchData.results || [])
      .filter((p) => (p.rating || 0) > 4.5)
      .slice(0, 6);

    const restaurants = places.map((place) => {
      const cuisine = place.types?.filter((t) => t !== 'point_of_interest' && t !== 'establishment' && t !== 'restaurant').join(', ') || 'Restaurant';
      const photoReference = place.photos?.[0]?.photo_reference;
      const photoUrl = photoReference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(photoReference)}&key=${GOOGLE_PLACES_API_KEY}`
        : getFallbackImage(cuisine);

      const dishNames = ['Featured Dish', 'Chef Special', 'Popular Item'];
      const dishPhotos = dishNames.map((_, index) => {
        const ref = place.photos?.[index + 1]?.photo_reference || photoReference;
        return ref
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${encodeURIComponent(ref)}&key=${GOOGLE_PLACES_API_KEY}`
          : getFallbackImage(cuisine);
      });

      return {
        id: place.place_id || place.name,
        name: place.name || 'Restaurant',
        cuisine,
        rating: place.rating || 0,
        address: place.formatted_address || 'Address not available',
        lat: place.geometry?.location?.lat || parseFloat(latitude),
        lng: place.geometry?.location?.lng || parseFloat(longitude),
        photo: photoUrl,
        dishes: dishNames.map((name, index) => ({
          name,
          image: dishPhotos[index],
        })),
      };
    });

    return restaurants;
  } catch (error) {
    throw error;
  }
}

app.get('/api/restaurants', async (req, res) => {
  try {
    const latitude = req.query.lat || '47.6062';
    const longitude = req.query.lng || '-122.3321';
    const term = req.query.term || 'restaurants';

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ error: 'Google Places API key is missing on the server.' });
    }

    const restaurants = await fetchGoogleRestaurants(latitude, longitude, term);
    res.json({ restaurants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Unable to fetch restaurants: ${error.message}` });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

function getFallbackImage(cuisine) {
  return 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80';
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
