# LDAP Playground

Minimal LDAP search script for verifying filters and bases.

## Setup

1) Install dependencies:

```bash
npm install
```

2) Edit `index.js` and fill `CONFIG`:
- `LDAP_URL`
- `LDAP_ADMIN_DN` (optional for anonymous bind)
- `LDAP_ADMIN_PASSWORD`
- `LDAP_USER_SEARCH_BASE`
- `LDAP_OBJECT_TYPE_FILTER`
- `LDAP_SEARCH_FILTER`
- `LDAP_SEARCH_FIELDS`
- `LDAP_CUSTOM_FILTER`

## Run

```bash
npm start -- "<searchValue>"
```

## Notes

- If `LDAP_CUSTOM_FILTER` is set, it is used as-is.
- `ldapjs` license: MIT.
