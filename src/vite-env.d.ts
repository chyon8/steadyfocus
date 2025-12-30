/// <reference types="vite/client" />
import 'react';

declare global {
  interface Window {
    electron: {
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      setFocusMode: (enable: boolean, minimized?: boolean) => void;
      setBackgroundMode: (enable: boolean) => void;
    };
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}
