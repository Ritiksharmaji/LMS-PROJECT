/** Server-only: where the Spring Boot API lives. */
export const API_URL = process.env.API_URL ?? "http://localhost:8080";

/** The organization whose catalog the public site shows (one deployment per org; see README for subdomains). */
export const DEFAULT_ORG = process.env.NEXT_PUBLIC_DEFAULT_ORG ?? "northfield";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
