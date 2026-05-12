const RolePill = ({ role }) => {
  if (role === "hosted") {
    return <span className="field-role-pill field-role-hosted">Hosted</span>;
  }
  if (role === "attended") {
    return <span className="field-role-pill field-role-attended">Attended</span>;
  }
  return null;
};

export default RolePill;
