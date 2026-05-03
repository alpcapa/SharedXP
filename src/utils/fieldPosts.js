// User-generated Field posts. Still localStorage in Phase 1; migrating to a
// `field_posts` table is a future task (separate from the bookings migration).

const FIELD_POSTS_STORAGE_KEY = "sharedxp-field-posts";

export const getStoredFieldPosts = () => {
  try {
    const raw = localStorage.getItem(FIELD_POSTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFieldPost = (post) => {
  try {
    const existing = getStoredFieldPosts();
    localStorage.setItem(
      FIELD_POSTS_STORAGE_KEY,
      JSON.stringify([post, ...existing])
    );
  } catch {
    // localStorage may be unavailable / quota exceeded — silently drop.
  }
};

export const deleteFieldPost = (postId) => {
  try {
    const existing = getStoredFieldPosts();
    const updated = existing.filter((post) => post.id !== postId);
    localStorage.setItem(FIELD_POSTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable / quota exceeded — silently drop.
  }
};
