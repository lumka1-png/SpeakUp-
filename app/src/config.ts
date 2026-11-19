/**
 * App-wide settings. To rename the app, change APP_NAME here and "name" in app.json.
 */
export const APP_NAME = 'SpeakUp!';
export const APP_NAME_ZH = '開口說英文';
export const PODCAST_NAME = 'SpeakUp Daily';
export const IS_BETA = true;

/**
 * Base URL of the SpeakUp! API server (see ../server). Set EXPO_PUBLIC_API_URL in .env.
 * When it is empty, the app runs in offline mode: rule-based speaking feedback
 * and a template podcast, so every screen still works without a server.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
