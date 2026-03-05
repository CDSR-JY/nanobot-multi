export {};

declare global {
  interface Window {
    __NANOBOT_RUNTIME_CONFIG__?: {
      NEXT_PUBLIC_API_URL?: string;
    };
  }
}
