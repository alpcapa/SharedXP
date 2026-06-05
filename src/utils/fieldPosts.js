// User-generated Field posts, stored in the `field_posts` Supabase table so
// they are visible to all users across devices and sessions.

import { supabase } from "../lib/supabase";

const MAX_RATING = 5;
const LOCAL_FALLBACK_KEY = "sharedxp:field_posts_fallback";

const isMissingRatingColumnError = (error) => {
  // 42703 = PostgreSQL "undefined_column"; PGRST204 = PostgREST schema-cache miss.
  // Both indicate the `rating` column doesn't exist yet (migration 022 not run).
  return error?.code === "42703" || error?.code === "PGRST204";
};

const clampRating = (value) => {
  const numeric = Number(value);
  return Math.max(0, Math.min(MAX_RATING, Number.isFinite(numeric) ? numeric : 0));
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

const resolveBookingRequestRating = (post, request) => {
  if (!request) return 0;
  if (post.role === "hosted") {
    // Host rated the guest — stored as host_rating.
    return Number(request.host_rating ?? 0);
  }
  // Guest rated the host — stored as guest_rating / guest_host_ratings.overall.
  return Number(request.guest_rating ?? request.guest_host_ratings?.overall ?? 0);
};

const avgByKey = (rows, keyField, valueField) => {
  const acc = {};
  for (const row of rows ?? []) {
    const k = row[keyField];
    if (!acc[k]) acc[k] = { sum: 0, count: 0 };
    acc[k].sum += Number(row[valueField]);
    acc[k].count += 1;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, { sum, count }]) => [k, sum / count]));
};

// Returns a map of "role:posterId" → average rating. Isolated so failures
// here never prevent posts from displaying.
const fetchPosterRatings = async (posts) => {
  try {
    const hostedIds = [...new Set(posts.filter((p) => p.role === "hosted").map((p) => p.posterId).filter(Boolean))];
    const attendedIds = [...new Set(posts.filter((p) => p.role !== "hosted").map((p) => p.posterId).filter(Boolean))];

    const [hostedResult, attendedResult] = await Promise.all([
      hostedIds.length > 0
        ? supabase.from("booking_requests").select("host_id, guest_rating").in("host_id", hostedIds).eq("status", "completed").gt("guest_rating", 0)
        : Promise.resolve({ data: [] }),
      attendedIds.length > 0
        ? supabase.from("booking_requests").select("requester_id, host_rating").in("requester_id", attendedIds).eq("status", "completed").gt("host_rating", 0)
        : Promise.resolve({ data: [] }),
    ]);

    const result = {};
    for (const [id, avg] of Object.entries(avgByKey(hostedResult.data, "host_id", "guest_rating"))) {
      result[`hosted:${id}`] = avg;
    }
    for (const [id, avg] of Object.entries(avgByKey(attendedResult.data, "requester_id", "host_rating"))) {
      result[`attended:${id}`] = avg;
    }
    return result;
  } catch (e) {
    console.error("[fieldPosts] poster rating fetch error:", e);
    return {};
  }
};

/**
 * Fetch a page of field posts from Supabase, newest first.
 * Returns { posts, hasMore } where hasMore indicates whether more pages exist.
 */
export const fetchFieldPosts = async ({ limit = 12, offset = 0 } = {}) => {
  try {
    let { data, error } = await supabase
      .from("field_posts")
      .select(
        "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, rating, source_request_id, created_at"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error && isMissingRatingColumnError(error)) {
      ({ data, error } = await supabase
        .from("field_posts")
        .select(
          "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, source_request_id, created_at"
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1));
    }
    if (error) {
      console.error("[fieldPosts] fetch error:", error);
      return { posts: [], hasMore: false };
    }

    const posts = (data ?? []).map(mapStorageRow);
    const posterRatings = await fetchPosterRatings(posts);

    const result = posts.map((post) => {
      const avg = posterRatings[`${post.role}:${post.posterId}`];
      return { ...post, posterRating: avg ? Math.round(avg * 10) / 10 : 0 };
    });

    return { posts: result, hasMore: data.length === limit };
  } catch (e) {
    console.error("[fieldPosts] fetch exception:", e);
    return { posts: [], hasMore: false };
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
        .insert({ ...savePayloadWithRating, likes: 0 })
        .select("id")
        .single();
      if (error && isMissingRatingColumnError(error)) {
        ({ data, error } = await supabase
          .from("field_posts")
          .insert({ ...savePayloadBase, likes: 0 })
          .select("id")
          .single());
      }
      if (error) {
        console.error("[fieldPosts] INSERT failed (code %s):", error.code, error.message, error);
        return null;
      }
      return data?.id ?? null;
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
      if (error) {
        console.error("[fieldPosts] update error:", error);
        return null;
      }
      return data?.id ?? null;
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
    console.error("[fieldPosts] save exception:", e);
    return null;
  }
};

/**
 * Report a field post as inappropriate. Returns true on success.
 */
export const reportFieldPost = async (postId, reporterId) => {
  if (!postId) return false;
  try {
    const { error } = await supabase
      .from("field_post_reports")
      .insert({ post_id: postId, reporter_id: reporterId ?? null });
    if (error) {
      console.error("[fieldPosts] report error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[fieldPosts] report exception:", e);
    return false;
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
  try {
    const { data, error } = await supabase
      .from("field_posts")
      .select("id")
      .eq("source_request_id", sourceRequestId)
      .eq("poster_id", posterId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data?.[0]?.id) return data[0].id;
    if (error) console.error("[fieldPosts] lookup id error:", error);
    return null;
  } catch (error) {
    console.error("[fieldPosts] lookup id exception:", error);
    return null;
  }
};

const LIKED_LOCAL_KEY = "sharedxp:field_post_liked_ids";

const loadLikedSet = () => {
  try {
    const raw = localStorage.getItem(LIKED_LOCAL_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const saveLikedSet = (set) => {
  try {
    localStorage.setItem(LIKED_LOCAL_KEY, JSON.stringify([...set]));
  } catch { /* storage unavailable */ }
};

/**
 * Returns the set of post IDs this device has liked, from localStorage.
 */
export const fetchLikedPostIds = () => loadLikedSet();

/**
 * Toggle a like for a field post. No auth required — anyone can like.
 * Liked state is stored in localStorage; the counter is updated via a
 * SECURITY DEFINER RPC so anon users can bypass RLS on field_posts.
 * Returns { liked: boolean, likes: number } on success, or null on error.
 */
export const toggleFieldPostLike = async (postId) => {
  if (!postId) return null;
  const likedSet = loadLikedSet();
  const isLiked = likedSet.has(postId);
  const delta = isLiked ? -1 : 1;
  try {
    const { data, error } = await supabase.rpc("adjust_field_post_likes", {
      p_post_id: postId,
      p_delta: delta,
    });
    if (error) {
      console.error("[fieldPosts] toggleLike rpc error:", error);
      return null;
    }
    if (isLiked) likedSet.delete(postId);
    else likedSet.add(postId);
    saveLikedSet(likedSet);
    return { liked: !isLiked, likes: data ?? 0 };
  } catch (e) {
    console.error("[fieldPosts] toggleLike exception:", e);
    return null;
  }
};

/**
 * Find a field post by source booking_request ID and poster ID.
 * Returns the mapped post object (including caption) or null if not found.
 */
export const lookupFieldPost = async (sourceRequestId, posterId) => {
  if (!sourceRequestId || !posterId) return null;
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
    if (!error && data?.[0]) return mapStorageRow(data[0]);
    if (error) console.error("[fieldPosts] lookup error:", error);
    return null;
  } catch (error) {
    console.error("[fieldPosts] lookup exception:", error);
    return null;
  }
};

/**
 * One-time migration: push any posts saved to localStorage by the old fallback
 * path into the DB, then clear the localStorage key.
 * Call this fire-and-forget after the user session is established.
 */
export const syncLocalFallbackPosts = async (userId) => {
  if (!userId) return;
  try {
    const raw = window.localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (!raw) return;
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts) || posts.length === 0) {
      window.localStorage.removeItem(LOCAL_FALLBACK_KEY);
      return;
    }
    // Only sync posts that belong to this user — RLS would reject others anyway.
    const ownPosts = posts.filter((p) => p.posterId === userId);
    if (ownPosts.length > 0) {
      await Promise.allSettled(ownPosts.map((p) => saveFieldPost(p)));
    }
    window.localStorage.removeItem(LOCAL_FALLBACK_KEY);
  } catch (e) {
    console.error("[fieldPosts] local fallback sync error:", e);
  }
};
