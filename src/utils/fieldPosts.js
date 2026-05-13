// User-generated Field posts, stored in the `field_posts` Supabase table so
// they are visible to all users across devices and sessions.

import { supabase } from "../lib/supabase";

/**
 * Fetch all field posts from Supabase, newest first.
 * Returns an array of camelCase post objects ready for display.
 */
export const fetchFieldPosts = async () => {
  try {
    const { data, error } = await supabase
      .from("field_posts")
      .select(
        "id, poster_id, role, host_name, host_photo, sport, city, country, caption, photos, likes, rating, source_request_id, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[fieldPosts] fetch error:", error);
      return [];
    }
    return (data ?? []).map((row) => ({
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
      rating: Number(row.rating ?? 0),
      sourceRequestId: row.source_request_id ?? null,
    }));
  } catch (e) {
    console.error("[fieldPosts] fetch exception:", e);
    return [];
  }
};

/**
 * Save a field post to Supabase. Returns the new post's UUID, or null on error.
 */
export const saveFieldPost = async (post) => {
  try {
    const savePayload = {
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
      rating: Math.max(0, Math.min(5, Number(post.rating ?? 0) || 0)),
    };

    if (post.id) {
      const { data, error } = await supabase
        .from("field_posts")
        .update(savePayload)
        .eq("id", post.id)
        .select("id")
        .single();
      if (error) {
        console.error("[fieldPosts] update error:", error);
        return null;
      }
      return data?.id ?? null;
    }

    if (post.sourceRequestId && post.posterId) {
      const existingId = await lookupFieldPostId(post.sourceRequestId, post.posterId);
      if (existingId) {
        const { data, error } = await supabase
          .from("field_posts")
          .update(savePayload)
          .eq("id", existingId)
          .select("id")
          .single();
        if (error) {
          console.error("[fieldPosts] update-by-source error:", error);
          return null;
        }
        return data?.id ?? null;
      }
    }

    const { data, error } = await supabase
      .from("field_posts")
      .insert({
        ...savePayload,
        likes: 0,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[fieldPosts] insert error:", error);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[fieldPosts] save exception:", e);
    return null;
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
    }
  } catch (e) {
    console.error("[fieldPosts] delete exception:", e);
  }
};

/**
 * Find the UUID of a field post by source booking_request ID and poster ID.
 * Returns the post UUID or null if not found.
 */
export const lookupFieldPostId = async (sourceRequestId, posterId) => {
  if (!sourceRequestId || !posterId) return null;
  try {
    const { data } = await supabase
      .from("field_posts")
      .select("id")
      .eq("source_request_id", sourceRequestId)
      .eq("poster_id", posterId)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
};
