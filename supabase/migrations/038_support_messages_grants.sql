-- Allow logged-in and anonymous users to insert support messages
-- (RLS policy already exists; these grants give the roles the privilege)
grant insert on support_messages to authenticated, anon;
