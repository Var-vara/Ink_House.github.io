-- ЗАМЕНИТЕ адрес внутри кавычек на свою почту.
-- Затем нажмите Run.
update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'YOUR_EMAIL@example.com'
);

-- Эта строка покажет результат. В столбце is_admin должно быть true.
select u.email, p.is_admin
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'YOUR_EMAIL@example.com';
