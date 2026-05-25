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
      const remoteRating = Number(remotePost.rating ?? 0);
      const localRating = Number(localPost.rating ?? 0);
      merged[matchIndex] = {
        ...remotePost,
        ...localPost,
        postedAt: remotePost.postedAt ?? localPost.postedAt,
        rating: remoteRating > 0
          ? remotePost.rating
          : localRating > 0
            ? localPost.rating
            : 0,
      };
    } else {
      merged.push(localPost);
    }
  });

  return sortPostsByPostedAt(merged);
};

const resolveBookingRequestRating = (post, request) => {
  if (!request) return 0;
  if (post.role === "hosted") {
    // Host rated the guest — stored as host_rating.
    return Number(request.host_rating ?? 0);
  }
  // Guest rated the host — stored as guest_rating / guest_host_ratings.overall.
  return Number(request.guest_rating ?? request.guest_host_ratings?.overall ?? 0);
};

const hasRatingSourceRequest = (post) => !!post.sourceRequestId;

const hydrateMissingRatingsFromBookingRequests = async (posts) => {
  const needsHydration = posts.filter(hasRatingSourceRequest);
  if (!needsHydration.length) return posts;

  const requestIds = [
    ...new Set(needsHydration.map((post) => post.sourceRequestId).filter(Boolean)),
  ];
  if (!requestIds.length) return posts;
  try {
    const { data, error } = await supabase
      .from("booking_requests")
      .select("id, guest_rating, guest_host_ratings, host_rating")
      .in("id", requestIds);
    if (error) {
      console.error("[fieldPosts] rating hydration error:", error);
      return posts;
    }

    const requestById = new Map((data ?? []).map((row) => [row.id, row]));
    return posts.map((post) => {
      if (!hasRatingSourceRequest(post)) return post;
      const request = requestById.get(post.sourceRequestId);
      if (!request) return post;
      const nextRating = clampRating(resolveBookingRequestRating(post, request));
      if (nextRating <= 0) return post;
      return Number(post.rating ?? 0) === nextRating
        ? post
        : { ...post, rating: nextRating };
    });
  } catch (error) {
    console.error("[fieldPosts] rating hydration exception:", error);
    return posts;
  }
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
    const mergedPosts = mergeRemoteAndLocalPosts(data);

    const posterRatings = await fetchPosterRatings(mergedPosts);

    return mergedPosts.map((post) => {
      const avg = posterRatings[`${post.role}:${post.posterId}`];
      return { ...post, posterRating: avg ? Math.round(avg * 10) / 10 : 0 };
    });
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
        // Table doesn't exist yet (migration not run) — use localStorage so the
        // post at least survives the session.
        if (isFieldPostsUnavailableError(error)) {
          console.warn("[fieldPosts] field_posts table unavailable; using local storage:", error.code);
          return upsertLocalFallbackPost(post);
        }
        // Any other error (RLS/permission, FK constraint, etc.) means the post
        // will NOT be persisted. Log clearly so it's visible in the console, and
        // return null so the caller can surface the failure to the user.
        console.error("[fieldPosts] INSERT failed (code %s):", error.code, error.message, error);
        return null;
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
  try {
    const { data, error } = await supabase
      .from("field_posts")
      .select("id")
      .eq("source_request_id", sourceRequestId)
      .eq("poster_id", posterId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!error && data?.[0]?.id) return data[0].id;
    if (error && isFieldPostsUnavailableError(error)) {
      const local = readLocalFallbackPosts().find(
        (p) => p.sourceRequestId === sourceRequestId && p.posterId === posterId
      );
      return local?.id ?? null;
    }
    if (error) console.error("[fieldPosts] lookup id error:", error);
    return null;
  } catch (error) {
    console.error("[fieldPosts] lookup id exception:", error);
    return null;
  }
};

/**
 * Fetch the set of post IDs that the given user has liked.
 * Returns a Set<string> of post UUIDs.
 */
export const fetchLikedPostIds = async (userId) => {
  if (!userId) return new Set();
  try {
    const { data, error } = await supabase
      .from("field_post_likes")
      .select("post_id")
      .eq("user_id", userId);
    if (error) {
      console.error("[fieldPosts] fetchLikedPostIds error:", error);
      return new Set();
    }
    return new Set((data ?? []).map((r) => r.post_id));
  } catch (e) {
    console.error("[fieldPosts] fetchLikedPostIds exception:", e);
    return new Set();
  }
};

/**
 * Toggle a like for a field post.
 * Returns { liked: boolean, likes: number } on success, or null on error.
 * The DB trigger on field_post_likes keeps field_posts.likes in sync atomically.
 */
export const toggleFieldPostLike = async (postId, userId, currentLikeCount) => {
  if (!postId || !userId) return null;
  try {
    const { data: existing, error: checkError } = await supabase
      .from("field_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (checkError) {
      console.error("[fieldPosts] like check error:", checkError);
      return null;
    }

    const isLiked = !!existing;

    if (isLiked) {
      const { error: deleteError } = await supabase
        .from("field_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (deleteError) {
        console.error("[fieldPosts] unlike error:", deleteError);
        return null;
      }
      return { liked: false, likes: Math.max(0, currentLikeCount - 1) };
    } else {
      const { error: insertError } = await supabase
        .from("field_post_likes")
        .insert({ post_id: postId, user_id: userId });
      if (insertError) {
        console.error("[fieldPosts] like error:", insertError);
        return null;
      }
      return { liked: true, likes: currentLikeCount + 1 };
    }
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
    if (error && isFieldPostsUnavailableError(error)) {
      const local = readLocalFallbackPosts()
        .map(mapFallbackRow)
        .find((p) => p.sourceRequestId === sourceRequestId && p.posterId === posterId);
      return local ?? null;
    }
    if (error) console.error("[fieldPosts] lookup error:", error);
    return null;
  } catch (error) {
    console.error("[fieldPosts] lookup exception:", error);
    return null;
  }
};
