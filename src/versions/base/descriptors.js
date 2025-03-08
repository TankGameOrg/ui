/* global SITE_PUBLIC_PATH */

export function imageBackground(url) {
    return url?.length > 0 ? `url("${SITE_PUBLIC_PATH}assets/${url}.png")` : undefined;
}
