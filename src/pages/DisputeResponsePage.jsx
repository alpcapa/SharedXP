import { useParams, Navigate } from "react-router-dom";

// The dispute response flow was moved into an inline modal on /history.
// This route is kept so old email links still work — it redirects straight
// to the pending tab with the dispute pre-selected so the modal auto-opens.
const DisputeResponsePage = () => {
  const { disputeId } = useParams();
  return <Navigate to={`/history?tab=pending&dispute=${disputeId}`} replace />;
};

export default DisputeResponsePage;
