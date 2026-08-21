/**
 * Prefix a site-local URL with Astro's configured base path.
 * External URLs, protocol-relative URLs, anchors, and special schemes are
 * returned unchanged.
 */
export function withBase(path: string): string {
	if (!path) return path;
	if (
		path.startsWith("#") ||
		path.startsWith("//") ||
		/^[a-z][a-z\d+.-]*:/i.test(path)
	) {
		return path;
	}

	const configuredBase = import.meta.env.BASE_URL || "/";
	const trimmedBase = configuredBase.replace(/^\/+|\/+$/g, "");
	const base = trimmedBase ? `/${trimmedBase}` : "";
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	if (
		base &&
		(normalizedPath === base ||
			normalizedPath.startsWith(`${base}/`) ||
			normalizedPath.startsWith(`${base}?`) ||
			normalizedPath.startsWith(`${base}#`))
	) {
		return normalizedPath;
	}

	return `${base}${normalizedPath}` || "/";
}

/** Remove Astro's configured base path from a browser pathname. */
export function withoutBase(pathname: string): string {
	const configuredBase = import.meta.env.BASE_URL || "/";
	const trimmedBase = configuredBase.replace(/^\/+|\/+$/g, "");
	if (!trimmedBase) return pathname || "/";

	const base = `/${trimmedBase}`;
	if (pathname === base) return "/";
	if (pathname.startsWith(`${base}/`)) {
		return pathname.slice(base.length) || "/";
	}
	return pathname || "/";
}
