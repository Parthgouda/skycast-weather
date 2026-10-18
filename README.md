# SkyCast Weather App

A responsive weather dashboard built with React + Vite. It includes city/postal-code search with suggestions, browser geolocation with a London fallback, current conditions, humidity, wind, feels-like temperature, UV index, sunrise/sunset, an hourly temperature chart, and a 7-day forecast. Celsius/metric and Fahrenheit/imperial display toggles update without reloading the page.

## Requirements
- Node.js 18 or newer
- npm
- Internet connection for live geocoding and weather data

## Run locally

1. Extract the ZIP.
2. Open a terminal in the `skycast-weather` folder.
3. Install packages:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open the local URL printed by Vite, usually `http://localhost:5173`.

For a production build:

```bash
npm run build
npm run preview
```

## Data source and API keys
The app uses the public Open-Meteo Forecast API and Geocoding API. No API key is required, so there are no private keys to commit or configure. Browser geolocation works on `localhost` and secure HTTPS sites; on a regular non-secure hosted HTTP site, the browser may block it. If permission is denied, SkyCast loads London by default.

## Features
- City and postal-code geocoding suggestions
- Current temperature, conditions, humidity, wind, feels-like temperature
- Local time and date for the selected location
- Browser geolocation and fallback city
- °C / °F and m/s / mph display toggle
- Seven-day forecast and next-hours temperature chart
- Sunrise, sunset, UV index
- Loading, invalid-search, and network-error states
- Responsive bento-style desktop layout and stacked mobile layout
- Reduced-motion accessibility support

## Notes
- Live weather requires internet access. The app intentionally has no hard-coded sample forecast.
- Open-Meteo provides the weather information. See https://open-meteo.com/ for API details and attribution/licensing information.
