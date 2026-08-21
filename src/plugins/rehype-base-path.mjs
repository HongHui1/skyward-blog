import { visit } from "unist-util-visit";

function prefixBase(value) {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
		return value;
	}

	const configured = process.env.BASE_PATH || "/";
	const trimmed = configured.replace(/^\/+|\/+$/g, "");
	if (!trimmed) return value;

	const base = `/${trimmed}`;
	if (value === base || value.startsWith(`${base}/`)) return value;
	return `${base}${value}`;
}

/** Prefix root-relative links and media embedded in Markdown content. */
export function rehypeBasePath() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (!node.properties) return;
			for (const property of ["href", "src", "poster"]) {
				if (property in node.properties) {
					node.properties[property] = prefixBase(node.properties[property]);
				}
			}
		});
	};
}
