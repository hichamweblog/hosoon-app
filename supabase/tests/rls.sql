-- Run ONLY against a local/staging Supabase with pgTAP enabled: supabase test db
-- Synthetic users are rolled back. No production data is needed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
insert into auth.users(id, email) values
 ('11111111-1111-4111-8111-111111111111','hosoon-test-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','hosoon-test-b@example.invalid');
insert into public.user_progress(user_id) values
 ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::integer from public.user_progress), 1, 'only own row visible');
select is((select count(*)::integer from public.user_progress where user_id='22222222-2222-4222-8222-222222222222'), 0, 'other account invisible');
select throws_ok($$update public.user_progress set total_xp=999 where user_id='11111111-1111-4111-8111-111111111111'$$, '42501', null, 'unprotected legacy writes denied');
select throws_ok($$delete from public.user_progress where user_id='11111111-1111-4111-8111-111111111111'$$, '42501', null, 'direct deletion denied');
select throws_ok($$select public.save_hosoon_progress(0,0,'{"schemaVersion":4,"ownerId":"22222222-2222-4222-8222-222222222222","epoch":0,"currentDay":1}')$$, 'P0001', 'HOSOON_INVALID_SNAPSHOT', 'RPC cannot target another owner');
select throws_ok($$insert into public.thumun_corrections(thumun_id,user_id,note,source) values(1,'22222222-2222-4222-8222-222222222222','سبب صالح للاقتراح','مصدر')$$, '42501', null, 'cannot submit for another owner');
select lives_ok($$insert into public.thumun_corrections(thumun_id,user_id,note,source) values(1,'11111111-1111-4111-8111-111111111111','سبب صالح للاقتراح','مصدر')$$, 'own suggestion accepted');
select throws_ok($$insert into public.thumun_corrections(thumun_id,user_id,note,source,status) values(1,'11111111-1111-4111-8111-111111111111','سبب صالح للاقتراح','مصدر','approved')$$, '42501', null, 'cannot approve own suggestion');
select throws_ok($$insert into public.thumun_corrections(thumun_id,user_id,note,source) values(999,'11111111-1111-4111-8111-111111111111','سبب صالح للاقتراح','مصدر')$$, '23514', null, 'thumun numeric bounds enforced');
select * from finish();
rollback;
