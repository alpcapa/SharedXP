import { supabase } from "../lib/supabase";

export const sendNotification = async (emailType, bookingRequestId, extra = {}) => {
  try {
    const { error } = await supabase.functions.invoke("booking-notify", {
      body: { emailType, bookingRequestId, ...extra },
    });
    if (error) console.error("[notify]", emailType, error);
  } catch (e) {
    console.error("[notify] exception:", e);
  }
};
