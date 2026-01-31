/**
 * Types for embedding code-notes in other applications
 */

/**
 * Props for the embeddable CodeNotesApp component
 */
export interface CodeNotesEmbedProps {
  /**
   * Whether code-notes is running in embedded mode.
   * When true, hides outer navigation elements.
   */
  embedded?: boolean;

  /**
   * Optional class name for the root container
   */
  className?: string;

  /**
   * Whether to wrap the app in a Router.
   * Default: true. Set to false if embedding in an app that already has a Router.
   */
  useRouter?: boolean;

  /**
   * Base path for navigation when embedded (e.g., "/code-notes").
   */
  basePath?: string;

  /**
   * Callback when user requests logout.
   */
  onLogoutRequest?: () => void;

  /**
   * Skip auth check - use when tokens are provided externally (e.g., embedded mode).
   * Defaults to the value of `embedded` if not specified.
   */
  skipAuth?: boolean;
}
