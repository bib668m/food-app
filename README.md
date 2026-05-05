# Nearby Restaurant Finder

A restaurant search app using Google Places to return nearby restaurants rated higher than 4.5 and show dish photos.

## Features
- Real restaurant data from Google Places
- Filters restaurants with rating > 4.5
- Displays restaurant cards with dish photo galleries
- Uses browser geolocation for nearby relevance

## Setup
1. Add your Google Places API key to `.env`:
   ```env
   GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your browser

## Notes
- If location permission is denied, the app uses a default city location.
- The backend proxies Google Places requests to keep your API key private.