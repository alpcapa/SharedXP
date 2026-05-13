// User-generated Field posts, stored in the `field_posts` Supabase table so
// they are visible to all users across devices and sessions.

import { supabase } from "../lib/supabase";

const LOCAL_FALLBACK_KEY = "sharedxp:field_posts_fallback";
const MAX_RATING = 5;

const isMissingRatingColumnError = (error) => {
  return error?.code === "42703";
};

const isUpdateNotAllowedError = (error) => {
  return error?.code === "42501";
};

const isUpdateNoRowError = (error) => {
  return error?.code === "PGRST116";
};

const isFieldPostsUnavailableError = (error) => {
  const raw = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return error?.code === "42P01" || (error?.code === "42501" && raw.includes("field_posts"));
};

const readLocalFallbackPosts = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_FALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalFallbackPosts = (posts) => {
  try {
    window.localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(posts));
  } catch {
    // Ignore localStorage quota/availability issues.
  }
};

const clampRating = (value) => {
  const numeric = Number(value);
  return Math.max(0, Math.min(MAX_RATING, Number.isFinite(numeric) ? numeric : 0));
};

const sortPostsByPostedAt = (posts) => {
  return [...posts].sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
};

const generateFallbackId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const matchesExistingLocalPost = (storedPost, incomingPost) => {
  if (storedPost.id === incomingPost.id) return true;
  if (!incomingPost.sourceRequestId) return false;
  return (
    storedPost.sourceRequestId === incomingPost.sourceRequestId &&
    storedPost.posterId === incomingPost.posterId
  );
};

const mapStorageRow = (row) => ({
  id: row.id,
  posterId: row.poster_id,
  role: row.role,
  hostName: row.host_name,
  hostPhoto: row.host_photo,
  sport: row.sport,
  city: row.city,
  country: row.country,
  caption: row.caption,
  photos: Array.isArray(row.photos) ? row.photos : [],
  photo: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos[0] : "",
  postedAt: row.created_at,
  likes: row.likes ?? 0,
  rating: clampRating(row.rating),
  sourceRequestId: row.source_request_id ?? null,
});

const mapFallbackRow = (row) => ({
  id: row.id,
  posterId: row.posterId ?? "",
  role: row.role ?? "",
  hostName: row.hostName ?? "",
  hostPhoto: row.hostPhoto ?? "",
  sport: row.sport ?? "",
  city: row.city ?? "",
  country: row.country ?? "",
  caption: row.caption ?? "",
  photos: Array.isArray(row.photos) ? row.photos : [],
  photo: Array.isArray(row.photos) && row.photos.length > 0 ? row.photos[0] : "",
  postedAt: row.postedAt ?? new Date().toISOString(),
  likes: Number(row.likes ?? 0) || 0,
  rating: clampRating(row.rating),
  sourceRequestId: row.sourceRequestId ?? null,
});

const upsertLocalFallbackPost = (post) => {
  const posts = readLocalFallbackPosts();
  const existing = posts.find((storedPost) => matchesExistingLocalPost(storedPost, post));
  const id = existing?.id ?? post.id ?? generateFallbackId();
  const next = mapFallbackRow({
    id,
    posterId: post.posterId,
    role: post.role,
    hostName: post.hostName,
    hostPhoto: post.hostPhoto,
    sport: post.sport,
    city: post.city,
    country: post.country,
    caption: post.caption,
    photos: Array.isArray(post.photos) ? post.photos : [],
    postedAt: existing?.postedAt ?? new Date().toISOString(),
    likes: existing?.likes ?? 0,
    rating: clampRating(post.rating),
    sourceRequestId: post.sourceRequestId ?? null,
  });
  const filtered = posts.filter((p) => p.id !== id);
  writeLocalFallbackPosts([...filtered, next]);
  return id;
};

const mergeRemoteAndLocalPosts = (remoteRows) => {
  const remotePosts = (remoteRows ?? []).map(mapStorageRow);
  const localPosts = readLocalFallbackPosts().map(mapFallbackRow);

  if (!localPosts.length) return remotePosts;

  const merged = [...remotePosts];
  localPosts.forEach((localPost) => {
    const matchIndex = merged.findIndex(
      (remotePost) =>
        remotePost.id === localPost.id ||
        (
          localPost.sourceRequestId &&
          remotePost.sourceRequestId === localPost.sourceRequestId &&
          remotePost.posterId === localPost.posterId
        )
    );

    if (matchIndex >= 0) {
      const remotePost = merged[matchIndex];
      merged[matchIndex] = {
        ...remotePost,
        ...localPost,
        postedAt: remotePost.postedAt ?? localPost.postedAt,
      };
    } else {
      merged.push(localPost);
    }
  });

  return sortPostsByPostedAt(merged);
};

/**
 * Fetch all field posts from Supabase, newest first.
 * Returns an array of camelCase post objects ready for display.
 */
export const fetchFieldPosts = async () => {
  try {
    let { data, error } = await supabase
      .from("field_posts")
      .select(
        "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, rating, source_request_id, created_at"
      )
      .order("created_at", { ascending: false });
    if (error && isMissingRatingColumnError(error)) {
      ({ data, error } = await supabase
        .from("field_posts")
        .select(
          "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, source_request_id, created_at"
        )
        .order("created_at", { ascending: false }));
    }
    if (error) {
      console.error("[fieldPosts] fetch error:", error);
      if (isFieldPostsUnavailableError(error)) {
        return sortPostsByPostedAt(readLocalFallbackPosts().map(mapFallbackRow));
      }
      return [];
    }
    return mergeRemoteAndLocalPosts(data);
  } catch (e) {
    console.error("[fieldPosts] fetch exception:", e);
    return sortPostsByPostedAt(readLocalFallbackPosts().map(mapFallbackRow));
  }
};

/**
 * Save a field post to Supabase. Returns the new post's UUID, or null on error.
 */
export const saveFieldPost = async (post) => {
  try {
    const savePayloadBase = {
      poster_id: post.posterId,
      role: post.role ?? "",
      host_name: post.hostName ?? "",
      host_photo: post.hostPhoto ?? "",
      sport: post.sport ?? "",
      city: post.city ?? "",
      country: post.country ?? "",
      caption: post.caption ?? "",
      photos: Array.isArray(post.photos) ? post.photos : [],
      source_request_id: post.sourceRequestId ?? null,
    };
    const savePayloadWithRating = {
      ...savePayloadBase,
      rating: clampRating(post.rating),
    };

    const insertPost = async () => {
      let { data, error } = await supabase
        .from("field_posts")
        .insert({
          ...savePayloadWithRating,
          likes: 0,
        })
        .select("id")
        .single();
      if (error && isMissingRatingColumnError(error)) {
        ({ data, error } = await supabase
          .from("field_posts")
          .insert({
            ...savePayloadBase,
            likes: 0,
          })
          .select("id")
          .single());
      }
      if (error) {
        console.error("[fieldPosts] insert error; falling back to local post storage:", error);
        return upsertLocalFallbackPost(post);
      }
      if (data?.id) return data.id;
      console.warn("[fieldPosts] insert returned no id; falling back to local post storage");
      return upsertLocalFallbackPost(post);
    };

    const updatePost = async (postId) => {
      let { data, error } = await supabase
        .from("field_posts")
        .update(savePayloadWithRating)
        .eq("id", postId)
        .select("id")
        .maybeSingle();
      if (error && isMissingRatingColumnError(error)) {
        ({ data, error } = await supabase
          .from("field_posts")
          .update(savePayloadBase)
          .eq("id", postId)
          .select("id")
          .maybeSingle());
      }
      if (!error && data?.id) return data.id;
      if (isUpdateNotAllowedError(error) || isUpdateNoRowError(error) || (!error && !data?.id)) {
        console.warn(
          "[fieldPosts] UPDATE unavailable, falling back to local post storage for post:",
          postId
        );
        return upsertLocalFallbackPost(post);
      }
      console.error("[fieldPosts] update error; falling back to local post storage:", error);
      return upsertLocalFallbackPost(post);
    };

    if (post.id) {
      return updatePost(post.id);
    }

    if (post.sourceRequestId && post.posterId) {
      const existingId = await lookupFieldPostId(post.sourceRequestId, post.posterId);
      if (existingId) {
        return updatePost(existingId);
      }
    }

    return insertPost();
  } catch (e) {
    console.error("[fieldPosts] save exception; falling back to local post storage:", e);
    return upsertLocalFallbackPost(post);
  }
};

/**
 * Delete a field post from Supabase by its UUID. Returns a promise.
 */
export const deleteFieldPost = async (postId) => {
  try {
    const { error } = await supabase
      .from("field_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      console.error("[fieldPosts] delete error:", error);
      if (isFieldPostsUnavailableError(error)) {
        const filtered = readLocalFallbackPosts().filter((p) => p.id !== postId);
        writeLocalFallbackPosts(filtered);
        return true;
      }
      return false;
    }
    return true;
  } catch (e) {
    console.error("[fieldPosts] delete exception:", e);
    return false;
  }
};

/**
 * Find the UUID of a field post by source booking_request ID and poster ID.
 * Returns the post UUID or null if not found.
 */
export const lookupFieldPostId = async (sourceRequestId, posterId) => {
  if (!sourceRequestId || !posterId) return null;
  const local = readLocalFallbackPosts().find(
    (p) => p.sourceRequestId === sourceRequestId && p.posterId === posterId
  );
  if (local?.id) return local.id;
  try {
    const { data, error } = await supabase
      .from("field_posts")
      .select("id")
      .eq("source_request_id", sourceRequestId)
      .eq("poster_id", posterId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error && isFieldPostsUnavailableError(error)) {
      return local?.id ?? null;
    }
    if (error) {
      console.error("[fieldPosts] lookup id error:", error);
      return null;
    }
    return data?.[0]?.id ?? null;
  } catch {
    return null;
  }
};

/**
 * Find a field post by source booking_request ID and poster ID.
 * Returns the mapped post object (including caption) or null if not found.
 */
export const lookupFieldPost = async (sourceRequestId, posterId) => {
  if (!sourceRequestId || !posterId) return null;
  const local = readLocalFallbackPosts()
    .map(mapFallbackRow)
    .find((p) => p.sourceRequestId === sourceRequestId && p.posterId === posterId);
  if (local) return local;
  try {
    const { data, error } = await supabase
      .from("field_posts")
      .select(
        "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, rating, source_request_id, created_at"
      )
      .eq("source_request_id", sourceRequestId)
      .eq("poster_id", posterId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error && isFieldPostsUnavailableError(error)) {
      return local ?? null;
    }
    if (error) {
      console.error("[fieldPosts] lookup error:", error);
      return null;
    }
    return data?.[0] ? mapStorageRow(data[0]) : null;
  } catch {
    return null;
  }
};
