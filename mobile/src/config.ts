/**
 * Where the Spring Boot API lives. A phone can't reach the Mac's `localhost`, so builds talk to the Mac's address on
 * the local Wi-Fi. Change it here for a deployed API, or on the phone from the sign-in screen (Server).
 */
export const DEFAULT_API_URL = 'http://10.191.237.20:8090';

/** The web app, for links people share (certificates). */
export const WEB_URL = 'http://10.191.237.20:3100';

/** Organization shown on the sign-in screen until the user picks another. */
export const DEFAULT_ORG = 'northfield';
