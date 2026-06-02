create table support_messages (
  id              uuid        primary key default gen_random_uuid(),
  from_email      text        not null,
  from_name       text        not null default '',
  subject         text        not null default '',
  body_text       text,
  body_html       text,
  reply_to        text,
  status          text        not null default 'unread'
                              check (status in ('unread', 'read', 'replied', 'resolved')),
  resend_id       text,
  received_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table support_messages enable row level security;

-- Only admins can access support messages
create policy "admin_all_support_messages" on support_messages
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Service role (edge functions) can insert without auth
create policy "service_insert_support_messages" on support_messages
  for insert
  with check (true);
