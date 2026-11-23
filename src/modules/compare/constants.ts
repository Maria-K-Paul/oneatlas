/** Most models the compare page shows side by side. */
export const MAX_COMPARE = 4;

export function compareHref(ids: string[]): string {
  return ids.length ? `/compare?models=${ids.join(",")}` : "/compare";
}
