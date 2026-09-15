/* ============================================================
   B_R Inline Editor — the GitHub half.

   Two jobs: hold a GitHub credential, and write a set of changed files back
   as ONE commit.

   Authentication is a fine-grained personal access token, pasted once per
   browser, NOT the OAuth popup the CMS at /admin uses. That is a deliberate
   downgrade in convenience for an upgrade in blast radius: the OAuth app asks
   for `scope=repo`, which is read and write on every repository the account
   can reach, while a fine-grained token can be pinned to this one repository
   with `Contents: read and write` and nothing else, plus an expiry date. It
   also removes the Cloudflare Worker, the OAuth app and the Cloudflare
   account from the stack entirely — GitHub is then the only service involved.

   The token lives in sessionStorage, so it dies when the tab closes and never
   survives a restart. On a host that serves the site's Content-Security-Policy
   that is a reasonable place for it. If the site ever moves somewhere that
   cannot send a CSP — GitHub Pages cannot — move this to a module-local
   variable and make it memory-only, because without CSP any injected script
   can read storage.

   One commit rather than one-per-file matters here: a text edit and an image
   swap usually land in two different files (the language file and the shared
   media file), and committing them separately would publish a half-done
   change and trigger two deploys. The Git Data API builds a tree and moves
   the branch once, so a save is atomic or it does not happen.
   ============================================================ */

// Mirrors admin/config.yml — backend.repo, backend.branch.
const REPO = 'Beyondrational/beyond-rational';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN_KEY = 'brEditToken';

export const TOKEN_HELP_URL =
  'https://github.com/settings/personal-access-tokens/new';

let token = sessionStorage.getItem(TOKEN_KEY);
let user = null;

export const isAuthed = () => Boolean(token) && user !== null;
export const hasStoredToken = () => Boolean(token);
export const currentUser = () => user;

/* Verifies a token and remembers it. Called with a pasted token, or with no
   argument on load to revive one sessionStorage already holds. */
export async function signIn(pasted) {
  if (pasted) token = pasted.trim();
  if (!token) throw new Error('Intet token.');

  try {
    user = await gh('/user');
  } catch (err) {
    signOut();
    throw new Error(`Tokenet blev afvist af GitHub (${err.message}). Er det udløbet?`);
  }

  // A token can authenticate fine and still be read-only here. Better to say
  // so now than to let someone write a paragraph and fail at Save. A
  // fine-grained token scoped to another repository 404s rather than 403s,
  // so both outcomes get the same explanation.
  let repo;
  try {
    repo = await gh(`/repos/${REPO}`);
  } catch {
    signOut();
    throw new Error(`Tokenet har ikke adgang til ${REPO}. Vælg det repo under "Repository access".`);
  }
  if (!repo.permissions || !repo.permissions.push) {
    signOut();
    throw new Error('Tokenet kan læse, men ikke skrive. Sæt "Contents" til "Read and write".');
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  return user;
}

export function signOut() {
  token = null;
  user = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

/* ---------- API ---------- */

async function gh(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch { /* ingen JSON-krop */ }
    throw new Error(`GitHub ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return res.status === 204 ? null : res.json();
}

/* btoa() throws on any code point above U+00FF, so every JSON file carrying
   an æ, ø, å or a ² has to be encoded through UTF-8 bytes first. Chunked
   because String.fromCharCode(...bytes) blows the argument limit on anything
   image-sized. */
function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(out);
}

export const textToBase64 = (str) => toBase64(new TextEncoder().encode(str));
export const bytesToBase64 = toBase64;

/* Reads a file as it stands on the branch right now. The editor uses this
   rather than the copy the page already fetched, because that one came from
   the CDN and may be a deploy behind. */
export async function readJSON(path) {
  const res = await fetch(
    `${API}/repos/${REPO}/contents/${encodeURI(path)}?ref=${BRANCH}`,
    { headers: { Accept: 'application/vnd.github.raw', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Kunne ikke læse ${path} (${res.status})`);
  return res.json();
}

/* files: [{ path, base64 }] — already encoded, text or binary alike. */
export async function commitFiles(files, message) {
  if (!token) throw new Error('Ikke logget ind.');
  if (!files.length) throw new Error('Ingen ændringer at gemme.');

  const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const parentSha = ref.object.sha;
  const parent = await gh(`/repos/${REPO}/git/commits/${parentSha}`);

  const tree = await Promise.all(files.map(async (f) => {
    const blob = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: f.base64, encoding: 'base64' }),
    });
    return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));

  const newTree = await gh(`/repos/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
  });

  const commit = await gh(`/repos/${REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }),
  });

  // No `force`. If main moved while the edit was open — a teammate, a merged
  // PR — this 422s instead of quietly dropping their commit, and the editor
  // tells the reader to reload.
  try {
    await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });
  } catch (err) {
    throw new Error(
      'Nogen har ændret main, mens du redigerede. Genindlæs siden og lav ændringen igen '
      + `(dine ord er ikke gemt). Teknisk: ${err.message}`
    );
  }

  return commit.sha;
}
