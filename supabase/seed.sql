-- Demo data: one fictional research site with three sponsors and four studies.
-- Dates are relative to today, so there is always something overdue, due, late or unpaid.
-- Idempotent: fixed ids, on conflict do nothing. Everything here is invented.

update settings set site_name = 'Harbourside Clinical Research (demo)' where id = 1;

insert into sponsors (id, name, kind, contact_name, email, payment_terms_days, currency) values
  ('10000000-0000-4000-8000-000000000001', 'Meridian Therapeutics', 'pharma', 'Claire Dawson', 'site.payments@meridian.example', 45, 'AUD'),
  ('10000000-0000-4000-8000-000000000002', 'Kestrel Devices', 'device', 'Ben Ortiz', 'clinical@kestrel.example', 30, 'USD'),
  ('10000000-0000-4000-8000-000000000003', 'Southern Cross Cardiology Group', 'investigator-initiated', 'Dr Hana Kim', 'trials@sccg.example', 30, 'AUD')
on conflict (id) do nothing;

insert into staff (id, name, role, email, gcp_trained_on, cv_signed_on) values
  ('20000000-0000-4000-8000-000000000001', 'Dr Anika Rao', 'principal investigator', 'anika@harbourside.example', current_date - 400, current_date - 300),
  ('20000000-0000-4000-8000-000000000002', 'Dr Tom Fifita', 'sub-investigator', 'tom@harbourside.example', current_date - 1300, current_date - 700),
  ('20000000-0000-4000-8000-000000000003', 'Mele Taufa', 'study coordinator', 'mele@harbourside.example', current_date - 500, current_date - 500),
  ('20000000-0000-4000-8000-000000000004', 'Jordan Lee', 'research nurse', 'jordan@harbourside.example', current_date - 200, current_date - 200),
  ('20000000-0000-4000-8000-000000000005', 'Priya Shah', 'data manager', 'priya@harbourside.example', current_date - 900, current_date - 900)
on conflict (id) do nothing;

insert into studies (id, sponsor_id, protocol, title, phase, status, pi_id, ethics_ref, ethics_approved_on, last_progress_report_on,
  target_enrolment, enrolment_opens_on, enrolment_closes_on, consent_version, consent_approved_on, closed_on, archive_until, currency) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'MER-301', 'Severe asthma biologic, 24 weeks', '3', 'enrolling',
   '20000000-0000-4000-8000-000000000001', 'HREC/24/QPCH/118', current_date - 400, null, 12, current_date - 150, current_date + 60, 'v3.0', current_date - 20, null, null, 'AUD'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'KES-210', 'Implantable cardiac monitor, 6 month follow-up', 'device', 'follow-up',
   '20000000-0000-4000-8000-000000000001', 'HREC/24/QPCH/044', current_date - 300, current_date - 30, 6, current_date - 260, current_date - 90, 'v1.0', current_date - 260, null, null, 'USD'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'SCC-IIT-04', 'Statin adherence registry', '4', 'closed',
   '20000000-0000-4000-8000-000000000001', 'HREC/21/QPCH/207', current_date - 1500, current_date - 400, 40, current_date - 1400, current_date - 600, 'v2.1', current_date - 1200, current_date - 200, current_date - 200 + 3650, 'AUD'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'MER-405', 'Chronic cough, dose finding', '2', 'startup',
   '20000000-0000-4000-8000-000000000001', null, null, null, 8, null, null, null, null, null, null, 'AUD')
on conflict (id) do nothing;

insert into visit_templates (id, study_id, seq, code, name, day, window_before, window_after, fee_cents) values
  ('40000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000001', 1, 'SCR', 'Screening', -14, 14, 13, 145000),
  ('40000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000001', 2, 'V1', 'Baseline and first dose', 0, 0, 0, 290000),
  ('40000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000001', 3, 'V2', 'Week 4', 28, 3, 3, 125000),
  ('40000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000001', 4, 'V3', 'Week 8', 56, 5, 5, 125000),
  ('40000000-0000-4000-8000-000000000105', '30000000-0000-4000-8000-000000000001', 5, 'V4', 'Week 12', 84, 7, 7, 125000),
  ('40000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000001', 6, 'V5', 'Week 16', 112, 7, 7, 125000),
  ('40000000-0000-4000-8000-000000000107', '30000000-0000-4000-8000-000000000001', 7, 'V6', 'Week 24 end of treatment', 168, 7, 7, 180000),
  ('40000000-0000-4000-8000-000000000201', '30000000-0000-4000-8000-000000000002', 1, 'D0', 'Implant', 0, 0, 0, 320000),
  ('40000000-0000-4000-8000-000000000202', '30000000-0000-4000-8000-000000000002', 2, 'D30', 'Day 30 check', 30, 7, 7, 95000),
  ('40000000-0000-4000-8000-000000000203', '30000000-0000-4000-8000-000000000002', 3, 'D90', 'Day 90 check', 90, 14, 14, 110000),
  ('40000000-0000-4000-8000-000000000204', '30000000-0000-4000-8000-000000000002', 4, 'D180', 'Day 180 final', 180, 14, 14, 140000)
on conflict (id) do nothing;

insert into delegations (id, study_id, staff_id, tasks, start_on, end_on, pi_signed_on) values
  ('b0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'consent, visits, safety, eligibility', current_date - 160, null, current_date - 160),
  ('b0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'consent, visits, safety', current_date - 160, null, current_date - 160),
  ('b0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'consent, visits, data entry', current_date - 160, null, current_date - 160),
  ('b0000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'visits, dispensing', current_date - 100, null, current_date - 100),
  ('b0000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'consent, visits, safety, implant', current_date - 270, null, current_date - 270),
  ('b0000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'visits, safety', current_date - 270, null, current_date - 270),
  ('b0000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'consent, visits, data entry', current_date - 270, null, current_date - 270)
on conflict (id) do nothing;

insert into participants (id, study_id, subject_number, initials, status, referral_source, consented_on, consent_version, baseline_on, ended_on, end_reason, coordinator_id) values
  ('50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000001', '301-001', 'J.M.', 'enrolled', 'Clinic database', current_date - 125, 'v2.0', current_date - 120, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000001', '301-002', 'R.T.', 'enrolled', 'GP referral', current_date - 66, 'v2.0', current_date - 60, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000001', '301-003', 'S.K.', 'enrolled', 'Facebook ad', current_date - 19, 'v3.0', current_date - 15, null, null, '20000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000001', '301-004', 'A.P.', 'screen-failed', 'Facebook ad', current_date - 40, 'v2.0', null, current_date - 36, 'Eosinophil count below the inclusion level', '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000105', '30000000-0000-4000-8000-000000000001', '301-005', 'L.W.', 'screening', 'Facebook ad', current_date - 10, 'v2.0', null, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000106', '30000000-0000-4000-8000-000000000001', '301-006', 'D.N.', 'prescreen', 'GP referral', null, null, null, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000107', '30000000-0000-4000-8000-000000000001', '301-007', 'P.H.', 'screen-failed', 'Trial registry', current_date - 90, 'v2.0', null, current_date - 85, 'Smoking history over the limit', '20000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000201', '30000000-0000-4000-8000-000000000002', '210-001', 'G.B.', 'enrolled', 'Cardiology clinic', current_date - 205, 'v1.0', current_date - 200, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000202', '30000000-0000-4000-8000-000000000002', '210-002', 'F.A.', 'enrolled', 'Cardiology clinic', current_date - 175, 'v1.0', current_date - 170, null, null, '20000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000203', '30000000-0000-4000-8000-000000000002', '210-003', 'E.V.', 'enrolled', 'GP referral', current_date - 104, 'v1.0', current_date - 100, null, null, '20000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

-- Visits: (participant, template) with how each one went.
insert into visits (id, participant_id, template_id, name, scheduled_on, completed_on, status, performed_by) values
  -- 301-001: Week 4 done six days late, Week 16 overdue
  ('60000000-0000-4000-8000-000000010101', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000101', 'Screening', null, current_date - 125, 'completed', '20000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000010102', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000102', 'Baseline and first dose', null, current_date - 120, 'completed', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000010103', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000103', 'Week 4', null, current_date - 86, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000010104', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000104', 'Week 8', null, current_date - 64, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000010105', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000105', 'Week 12', null, current_date - 35, 'completed', '20000000-0000-4000-8000-000000000004'),
  ('60000000-0000-4000-8000-000000010106', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000106', 'Week 16', null, null, 'scheduled', null),
  ('60000000-0000-4000-8000-000000010107', '50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000107', 'Week 24 end of treatment', null, null, 'scheduled', null),
  -- 301-002: Week 8 window open now
  ('60000000-0000-4000-8000-000000010201', '50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000101', 'Screening', null, current_date - 64, 'completed', '20000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000010202', '50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000102', 'Baseline and first dose', null, current_date - 60, 'completed', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000010203', '50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000103', 'Week 4', null, current_date - 31, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000010204', '50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000104', 'Week 8', current_date + 1, null, 'scheduled', null),
  ('60000000-0000-4000-8000-000000010205', '50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000105', 'Week 12', null, null, 'scheduled', null),
  -- 301-003: early in treatment
  ('60000000-0000-4000-8000-000000010301', '50000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000101', 'Screening', null, current_date - 19, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000010302', '50000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000102', 'Baseline and first dose', null, current_date - 15, 'completed', '20000000-0000-4000-8000-000000000004'),
  ('60000000-0000-4000-8000-000000010303', '50000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000103', 'Week 4', current_date + 13, null, 'scheduled', null),
  -- screen failures and screening
  ('60000000-0000-4000-8000-000000010401', '50000000-0000-4000-8000-000000000104', '40000000-0000-4000-8000-000000000101', 'Screening', null, current_date - 38, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000010501', '50000000-0000-4000-8000-000000000105', '40000000-0000-4000-8000-000000000101', 'Screening', current_date + 2, null, 'scheduled', null),
  ('60000000-0000-4000-8000-000000010701', '50000000-0000-4000-8000-000000000107', '40000000-0000-4000-8000-000000000101', 'Screening', null, current_date - 91, 'completed', '20000000-0000-4000-8000-000000000004'),
  -- 210-001: Day 180 done by a nurse not delegated on this study
  ('60000000-0000-4000-8000-000000020101', '50000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000201', 'Implant', null, current_date - 200, 'completed', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000020102', '50000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000202', 'Day 30 check', null, current_date - 170, 'completed', '20000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000020103', '50000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000203', 'Day 90 check', null, current_date - 110, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000020104', '50000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000204', 'Day 180 final', null, current_date - 22, 'completed', '20000000-0000-4000-8000-000000000004'),
  -- 210-002: Day 90 twenty days late with a deviation on file, Day 180 window open
  ('60000000-0000-4000-8000-000000020201', '50000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000201', 'Implant', null, current_date - 170, 'completed', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000020202', '50000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000202', 'Day 30 check', null, current_date - 139, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000020203', '50000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000203', 'Day 90 check', null, current_date - 60, 'completed', '20000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000020204', '50000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000204', 'Day 180 final', current_date + 6, null, 'scheduled', null),
  -- 210-003: Day 90 window open, a serious event not yet reported
  ('60000000-0000-4000-8000-000000020301', '50000000-0000-4000-8000-000000000203', '40000000-0000-4000-8000-000000000201', 'Implant', null, current_date - 100, 'completed', '20000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000020302', '50000000-0000-4000-8000-000000000203', '40000000-0000-4000-8000-000000000202', 'Day 30 check', null, current_date - 72, 'completed', '20000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000020303', '50000000-0000-4000-8000-000000000203', '40000000-0000-4000-8000-000000000203', 'Day 90 check', current_date + 3, null, 'scheduled', null),
  ('60000000-0000-4000-8000-000000020304', '50000000-0000-4000-8000-000000000203', '40000000-0000-4000-8000-000000000204', 'Day 180 final', null, null, 'scheduled', null)
on conflict (id) do nothing;

insert into deviations (id, study_id, participant_id, visit_id, occurred_on, description, reported_on) values
  ('a0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000202', '60000000-0000-4000-8000-000000020203',
   current_date - 60, 'Day 90 visit outside window: participant in hospital for an unrelated procedure', current_date - 58)
on conflict (id) do nothing;

insert into adverse_events (id, participant_id, description, serious, onset_on, aware_at, reported_at, outcome, resolved_on) values
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000203', 'Hospitalised with syncope', true, current_date - 2, now() - interval '30 hours', null, 'ongoing', null),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000201', 'Pocket haematoma needing drainage', true, current_date - 91, now() - interval '90 days', now() - interval '90 days' + interval '40 hours', 'recovered', current_date - 75),
  ('70000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000202', 'Pneumonia, admitted', true, current_date - 51, now() - interval '50 days', now() - interval '50 days' + interval '6 hours', 'recovered', current_date - 40),
  ('70000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000101', 'Headache after dosing', false, current_date - 119, now() - interval '119 days', null, 'recovered', current_date - 117)
on conflict (id) do nothing;

insert into binder (id, study_id, staff_id, kind, version, approved_on, expires_on, location) values
  ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, 'ethics approval', 'protocol v4', current_date - 400, null, 'eISF/MER-301/01'),
  ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', null, 'consent form', 'v3.0', current_date - 20, null, 'eISF/MER-301/04'),
  ('80000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', null, 'insurance certificate', '2025-26', current_date - 370, current_date - 5, 'eISF/MER-301/09'),
  ('80000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', null, 'insurance certificate', '2026', current_date - 345, current_date + 20, 'eISF/KES-210/09'),
  ('80000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', null, 'CTN acknowledgement', null, current_date - 280, null, 'eISF/KES-210/02'),
  ('80000000-0000-4000-8000-000000000006', null, '20000000-0000-4000-8000-000000000001', 'medical registration', '2026', current_date - 340, current_date + 25, 'Site file/staff'),
  ('80000000-0000-4000-8000-000000000007', null, '20000000-0000-4000-8000-000000000002', 'GCP certificate', null, current_date - 1300, current_date - 205, 'Site file/staff'),
  ('80000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', null, 'site feasibility', null, current_date - 30, null, 'eISF/MER-405/00')
on conflict (id) do nothing;

insert into notes (id, study_id, participant_id, title, body) values
  ('c0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000101', 'Transport', 'Needs a taxi voucher for every visit. Prefers mornings.'),
  ('c0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', null, 'Start-up', 'Budget and contract with Meridian legal since last month. Ethics submission waits on the final protocol.')
on conflict (id) do nothing;

-- Money: start-up fees, completed visits and screen failures. 301-007's screen failure was never charged.
insert into charges (id, study_id, visit_id, kind, description, amount_cents, earned_on) values
  ('d0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, 'start-up', 'MER-301 start-up fee', 800000, current_date - 155),
  ('d0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', null, 'start-up', 'KES-210 start-up fee', 650000, current_date - 265),
  ('d0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', null, 'screen-fail', '301-004 screen failure', 90000, current_date - 36)
on conflict (id) do nothing;

insert into charges (study_id, visit_id, kind, description, amount_cents, earned_on)
select p.study_id, v.id, 'visit', p.subject_number || ' ' || v.name, t.fee_cents, v.completed_on
from visits v join participants p on p.id = v.participant_id join visit_templates t on t.id = v.template_id
where v.status = 'completed' and t.fee_cents > 0 and p.status <> 'screen-failed'
on conflict (visit_id) do nothing;

insert into invoices (id, study_id, number, issued_on, due_on, paid_on) values
  ('90000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'MER301-0006', current_date - 100, current_date - 55, current_date - 41),
  ('90000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'MER301-0007', current_date - 75, current_date - 30, null),
  ('90000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'KES210-0003', current_date - 100, current_date - 70, current_date - 64)
on conflict (id) do nothing;

update charges set invoice_id = '90000000-0000-4000-8000-000000000001'
where invoice_id is null and study_id = '30000000-0000-4000-8000-000000000001' and earned_on < current_date - 100;
update charges set invoice_id = '90000000-0000-4000-8000-000000000002'
where invoice_id is null and study_id = '30000000-0000-4000-8000-000000000001' and earned_on < current_date - 75;
update charges set invoice_id = '90000000-0000-4000-8000-000000000003'
where invoice_id is null and study_id = '30000000-0000-4000-8000-000000000002' and earned_on < current_date - 100;
update invoices i set amount_cents = coalesce((select sum(amount_cents) from charges c where c.invoice_id = i.id), 0)
where i.id in ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000003');
