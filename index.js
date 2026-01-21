/* eslint-disable no-console */
const ldap = require("ldapjs");

const CONFIG = {
	LDAP_URL: "ldap://10.20.42.2:389",
	LDAP_ADMIN_DN: "gramax@ics-it.ru",
	LDAP_ADMIN_PASSWORD: "<PASSWORD>",
	LDAP_USER_SEARCH_BASE: "OU=Enabled,OU=ICS-USERS,DC=ics,DC=local",
	LDAP_OBJECT_TYPE_FILTER: "objectCategory=person",
	LDAP_SEARCH_FILTER: "",
	LDAP_SEARCH_FIELDS: ["mail", "cn"],
	LDAP_CUSTOM_FILTER: "",
	LDAP_TIMEOUT_MS: 5000,
};

function buildFilter(searchValue) {
	const customFilter = CONFIG.LDAP_CUSTOM_FILTER.trim();
	if (customFilter) return customFilter;

	const objectTypeFilter = CONFIG.LDAP_OBJECT_TYPE_FILTER || "objectCategory=person";
	const searchFilter = CONFIG.LDAP_SEARCH_FILTER || "";
	const fields = CONFIG.LDAP_SEARCH_FIELDS.length ? CONFIG.LDAP_SEARCH_FIELDS : ["mail", "cn"];

	const orParts = fields.map((field) => `(${field}=*${searchValue}*)`).join("");
	return `(&(${objectTypeFilter})(|${orParts})${searchFilter})`;
}

async function searchOnce(client, base, options) {
	return new Promise((resolve, reject) => {
		client.search(base, options, (err, res) => {
			if (err) return reject(err);
			const items = [];

			res.on("searchEntry", (entry) => {
				const attrsArray = Array.isArray(entry.attributes) ? entry.attributes : [];
				const attrs = Object.fromEntries(attrsArray.map((a) => [a.type, a.values?.[0] ?? null]));
				items.push(attrs);
			});
			res.on("error", reject);
			res.on("end", () => resolve(items));
		});
	});
}

async function main() {
	const searchValue = process.argv[2];
	if (!searchValue) {
		console.error("Usage: node index.js <searchValue>");
		process.exit(1);
	}

	const url = CONFIG.LDAP_URL;
	const bindDN = CONFIG.LDAP_ADMIN_DN;
	const bindCredentials = CONFIG.LDAP_ADMIN_PASSWORD;
	const rawBases = CONFIG.LDAP_USER_SEARCH_BASE;
	const timeout = CONFIG.LDAP_TIMEOUT_MS;

	if (!url || !rawBases) {
		console.error("Missing required CONFIG fields: LDAP_URL, LDAP_USER_SEARCH_BASE");
		process.exit(1);
	}

	const bases = rawBases
		.split(";")
		.map((v) => v.trim())
		.filter(Boolean);
	if (!bases.length) {
		console.error("LDAP_USER_SEARCH_BASE is empty after parsing");
		process.exit(1);
	}

	const filter = buildFilter(searchValue);
	const attributes = ["dn", "cn", "mail", "uid", "sn", "displayName"];

	console.log("LDAP_URL:", url);
	console.log("BASES:", bases.join("; "));
	console.log("FILTER:", filter);
	console.log("ATTRIBUTES:", attributes.join(", "));

	const client = ldap.createClient({
		url,
		timeout,
		connectTimeout: timeout,
	});

	if (bindDN) {
		await new Promise((resolve, reject) => {
			client.bind(bindDN, bindCredentials, (err) => {
				if (err) return reject(err);
				resolve(true);
			});
		});
	} else {
		console.log("BIND: skipped (anonymous)");
	}

	try {
		const resultsByBase = await Promise.all(
			bases.map((base) =>
				searchOnce(client, base, {
					scope: "sub",
					attributes,
					filter,
				}),
			),
		);
		const results = resultsByBase.flat();
		console.log("RESULTS_COUNT:", results.length);
		console.log(JSON.stringify(results, null, 2));
	} finally {
		client.unbind();
	}
}

main().catch((err) => {
	console.error("LDAP_ERROR:", err?.message || err);
	process.exit(1);
});
