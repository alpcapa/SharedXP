export const hasRecoveryType = ({ search = "", hash = "" }) => {
  const queryParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    queryParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery"
  );
};

export const isResetPasswordRedirectUrl = (
  redirectTo,
  origin = typeof window !== "undefined" ? window.location.origin : ""
) => {
  if (!redirectTo || !origin) return false;
  try {
    const redirectUrl = new URL(redirectTo, origin);
    return redirectUrl.origin === origin && redirectUrl.pathname === "/reset-password";
  } catch {
    return false;
  }
};
