// Augment ImportMeta to include Vite's env fields used in this package.
// This avoids a hard dependency on vite/client which is not a direct dep of @code-notes/ui.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
