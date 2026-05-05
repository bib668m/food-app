const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!GOOGLE_PLACES_API_KEY) {
  console.warn('Warning: GOOGLE_PLACES_API_KEY is not set. Google Places API requests will fail.');
}

app.use(cors());
app.use(express.static(PUBLIC_DIR));

async function fetchGoogleRestaurants(latitude, longitude, term) {
  try {
    const requestBody = {
      textQuery: term || 'restaurants',
      pageSize: 10,
      locationBias: {
        circle: {
          center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          radius: 32187,
        },
      },
    };

    const searchResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.photos,places.formattedAddress,places.location,places.types',
      },
      body: JSON.stringify(requestBody),
    });

    const searchData = await searchResp.json();

    if (!searchResp.ok) {
      throw new Error(searchData.error?.message || 'Google Places search failed');
    }

    const places = (searchData.places || []).filter((p) => (p.rating || 0) > 4.5).slice(0, 6);

    const restaurants = places.map((place) => {
      const cuisine = place.types?.filter(t => t !== 'point_of_interest' && t !== 'establishment').join(', ') || 'Restaurant';
      const photos = place.photos || [];

      const dishNames = ['Featured Dish', 'Chef Special', 'Popular Item'];
      const dishPhotos = dishNames.map((_, index) => {
        if (photos[index + 1]?.name) {
          return `https://places.googleapis.com/v1/${photos[index + 1].name}/media?key=${GOOGLE_PLACES_API_KEY}&max_height_px=400`;
        }
        return photos[0]?.name
          ? `https://places.googleapis.com/v1/${photos[0].name}/media?key=${GOOGLE_PLACES_API_KEY}&max_height_px=400`
          : getFallbackImage(cuisine);
      });

      const photoUrl = photos[0]?.name
        ? `https://places.googleapis.com/v1/${photos[0].name}/media?key=${GOOGLE_PLACES_API_KEY}&max_height_px=400`
        : getFallbackImage(cuisine);

      return {
        id: place.name,
        name: place.displayName?.text || place.name || 'Restaurant',
        cuisine,
        rating: place.rating || 0,
        address: place.formattedAddress || 'Address not available',
        lat: place.location?.latitude || parseFloat(latitude),
        lng: place.location?.longitude || parseFloat(longitude),
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
