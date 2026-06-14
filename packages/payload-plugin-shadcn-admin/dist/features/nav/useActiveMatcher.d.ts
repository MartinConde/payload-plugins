/** Returns a matcher for highlighting the active nav item against the current
 *  admin route. `/admin` matches only exactly (so the dashboard link isn't
 *  always-on); every other href matches its own path or any sub-path, so a
 *  collection stays active on its list, create, and edit views. */
export declare function useActiveMatcher(): (href: string | undefined) => boolean;
