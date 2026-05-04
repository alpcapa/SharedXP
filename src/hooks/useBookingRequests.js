import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { sendNotification } from "../utils/sendNotification";
import { COMMISSION_RATE, TAX_RATE } from "../utils/pricing";

export const useBookingRequests = (currentUser) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  const fetchRequests = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("booking_requests")
      .select(`
        *,
        host_profile:profiles!host_id(full_name, first_name, last_name, photo_url, is_host),
        requester_profile:profiles!requester_id(full_name, first_name, last_name, photo_url, is_host)
      `)
      .or(`requester_id.eq.${currentUser.id},host_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });
    if (!error) {
      const rows = data ?? [];
      setRequests(rows);
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: unread } = await supabase
          .from("messages")
          .select("booking_request_id")
          .in("booking_request_id", ids)
          .neq("sender_id", currentUser.id)
          .is("read_at", null);
        const counts = {};
        for (const row of unread ?? []) {
          counts[row.booking_request_id] = (counts[row.booking_request_id] ?? 0) + 1;
        }
        setUnreadCounts(counts);
      } else {
        setUnreadCounts({});
      }
    }
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-confirm in_progress bookings whose auto_confirm_at has passed.
  // Runs client-side on every fetch so at least one participant triggers it.
  useEffect(() => {
    if (!currentUser?.id || !requests.length) return;
    const now = Date.now();
    const expired = requests.filter(
      (r) =>
        r.status === "in_progress" &&
        r.auto_confirm_at &&
        new Date(r.auto_confirm_at).getTime() <= now,
    );
    if (!expired.length) return;

    (async () => {
      for (const r of expired) {
        const now = new Date().toISOString();
        await supabase
          .from("booking_requests")
          .update({ status: "completed", updated_at: now })
          .eq("id", r.id);

        const { data: released } = await supabase
          .from("invoices")
          .update({ released_at: now })
          .eq("booking_request_id", r.id)
          .is("released_at", null)
          .select("id");

        // Only the client that actually flipped released_at sends notifications,
        // preventing duplicate emails when both participants are online.
        if (released?.length > 0) {
          await sendNotification("payment_processed_to_host", r.id);
          await sendNotification("experience_confirmed_to_host", r.id);
        }
      }
      fetchRequests();
    })();
  }, [requests, currentUser?.id, fetchRequests]);

  const acceptRequest = useCallback(async (requestId) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (!error) {
      await sendNotification("booking_accepted_to_requester", requestId);
      fetchRequests();
    }
    return !error;
  }, [fetchRequests]);

  const declineRequest = useCallback(async (requestId, reason) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "declined",
        decline_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (!error) {
      await sendNotification("booking_declined_to_requester", requestId);
      fetchRequests();
    }
    return !error;
  }, [fetchRequests]);

  const cancelRequest = useCallback(async (requestId) => {
    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (!error) fetchRequests();
    return !error;
  }, [fetchRequests]);

  const confirmExperience = useCallback(async (requestId) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "completed", updated_at: now })
      .eq("id", requestId);
    if (error) return false;

    await supabase
      .from("invoices")
      .update({ released_at: now })
      .eq("booking_request_id", requestId)
      .is("released_at", null);

    await sendNotification("payment_processed_to_host", requestId);
    await sendNotification("experience_confirmed_to_host", requestId);
    fetchRequests();
    return true;
  }, [fetchRequests]);

  const openDispute = useCallback(async (requestId, explanation) => {
    const { error: brError } = await supabase
      .from("booking_requests")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (brError) return false;

    const { data: dispute, error: dError } = await supabase
      .from("disputes")
      .insert({ booking_request_id: requestId, requester_explanation: explanation })
      .select()
      .single();
    if (dError || !dispute) return false;

    await sendNotification("dispute_opened", requestId, { disputeId: dispute.id });
    fetchRequests();
    return true;
  }, [fetchRequests]);

  const resolveDispute = useCallback(async (disputeId, resolution) => {
    const { data: dispute } = await supabase
      .from("disputes")
      .select("*, booking_request:booking_requests(*)")
      .eq("id", disputeId)
      .maybeSingle();
    if (!dispute) return false;

    const now = new Date().toISOString();
    const status = resolution === "refunded" ? "resolved_refunded" : "resolved_paid_host";

    await Promise.all([
      supabase
        .from("disputes")
        .update({ resolution, resolved_at: now, resolved_by: currentUser?.email ?? "admin" })
        .eq("id", disputeId),
      supabase
        .from("booking_requests")
        .update({ status, updated_at: now })
        .eq("id", dispute.booking_request_id),
    ]);

    if (resolution === "paid_host") {
      await supabase
        .from("invoices")
        .update({ released_at: now })
        .eq("booking_request_id", dispute.booking_request_id)
        .is("released_at", null);
      await sendNotification("dispute_resolved_paid_host", dispute.booking_request_id);
    } else {
      await sendNotification("dispute_resolved_refund", dispute.booking_request_id);
    }

    fetchRequests();
    return true;
  }, [currentUser?.email, fetchRequests]);

  // Compute invoice amounts (simulated)
  const computeInvoice = (price, currency) => {
    const gross = Number(price) || 0;
    const commission = Math.round(gross * COMMISSION_RATE * 100) / 100;
    const tax = Math.round(gross * TAX_RATE * 100) / 100;
    const net = Math.round((gross - commission - tax) * 100) / 100;
    return { gross_amount: gross, platform_commission: commission, tax, net_amount: net, currency };
  };

  return {
    requests,
    loading,
    unreadCounts,
    fetchRequests,
    acceptRequest,
    declineRequest,
    cancelRequest,
    confirmExperience,
    openDispute,
    resolveDispute,
    computeInvoice,
  };
};
