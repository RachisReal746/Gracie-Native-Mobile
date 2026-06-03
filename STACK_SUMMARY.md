# Gracie Mobile Tech Stack

## Front-end / Mobile App
- React 19
- React Native 0.83.2
- Expo 55.0.3
- Expo Router

## Data & API
- @supabase/supabase-js

## Backend
- Node.js (>=18)
- Express 5
- @supabase/supabase-js
- firebase-admin
- groq-sdk

## Build / Tooling
- babel-preset-expo
- expo-build-properties
- patch-package

## Configuration
- Expo app config with iOS/Android bundle identifiers and app scheme
- EAS project support via `extra.eas.projectId`
- Backend API URL: `https://gracie-backend.onrender.com`

## Notes
- The mobile app is built as an Expo-managed React Native application.
- The backend is a Node/Express API with Supabase and Firebase integrations.
- Styling is handled with Tailwind-inspired NativeWind.
