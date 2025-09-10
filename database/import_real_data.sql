-- Import Your Real Data to Supabase
-- Run this AFTER running full_migration.sql to set up your user

-- Get your user ID
DO $$
DECLARE
  user_id_var UUID;
BEGIN
  SELECT id INTO user_id_var FROM users WHERE email = 'smkaufman@gmail.com' LIMIT 1;
  
  -- Import your real events (first 10 as examples)
  INSERT INTO events (google_event_id, title, description, start_time, end_time, location, category, created_by) VALUES
  ('ien2jtpol8pn49gschgdqv0tmk', 'Cockeysville FC (Gallagher) at CVSC 2017 Red', 'To see detailed information for automatically created events like this one, use the official Google Calendar app.', '2025-09-20T17:15:00.000Z', '2025-09-20T18:15:00.000Z', '15. Home game Use the SportsEngine chat for last-minute changes/details., Baltimore, Maryland, United States', 'family', user_id_var),
  ('lnrl31ou9p726efs11o3172v3s', 'Hereford SC (LaPorta) at CVSC 2017 Red', 'To see detailed information for automatically created events like this one, use the official Google Calendar app.', '2025-10-04T13:15:00.000Z', '2025-10-04T14:15:00.000Z', 'AWAY game Use the SportsEngine chat for last-minute changes/details., Parkton, Maryland, United States, 21120', 'family', user_id_var),
  ('_60q30c1g60o30e1i60o4ac1g60rj8gpl88rj2c1h84s34h9g60s30c1g60o30c1g88r32ca56d144dq368ok8e9g64o30c1g60o30c1g60o30c1g60o32c1g60o30c1g60sj6hhk60r3cd1m8ookahhk710j6ea684r3ic216113ghhi6or0', 'SK Virtual Appointment with Dr. Smith', 'PLEASE DO NOT REPLY to this message. If it is in error, please contact your provider by portal', '2025-10-16T18:30:00.000Z', '2025-10-16T18:55:00.000Z', 'Microsoft Teams Meeting', 'personal', user_id_var),
  ('74hffij0jantal4qu64spc844g', 'Westminster SA (Harter) at CVSC 2017 Red', 'To see detailed information for automatically created events like this one, use the official Google Calendar app.', '2025-10-18T12:45:00.000Z', '2025-10-18T13:45:00.000Z', 'bottles Use the SportsEngine chat for last-minute changes/details., Westminster, Maryland, United States, 21157', 'family', user_id_var),
  ('bd47fqd57dc4dbkvjoapkcbj1g', 'Hickory SC (Rossi) at CVSC 2017 Red', 'To see detailed information for automatically created events like this one, use the official Google Calendar app.', '2025-10-25T15:15:00.000Z', '2025-10-25T16:15:00.000Z', 'HOME game. Use the SportsEngine chat for last-minute changes/details., Baltimore, Maryland, United States', 'family', user_id_var)
  ON CONFLICT (google_event_id) DO NOTHING;

  -- Import your tasks
  INSERT INTO tasks (title, description, category, priority, status, assigned_to) VALUES
  ('Review weekly schedule', 'Check all upcoming events for the week', 'planning', 2, 'pending', user_id_var),
  ('Prepare for soccer games', 'Get gear ready for upcoming matches', 'family', 3, 'pending', user_id_var),
  ('Schedule follow-up appointment', 'Book next appointment with Dr. Smith', 'health', 2, 'pending', user_id_var)
  ON CONFLICT DO NOTHING;

END $$;

-- Verify the import
SELECT 'Events imported:' as status, COUNT(*) as count FROM events WHERE created_by = (SELECT id FROM users WHERE email = 'smkaufman@gmail.com')
UNION ALL
SELECT 'Tasks imported:', COUNT(*) FROM tasks WHERE assigned_to = (SELECT id FROM users WHERE email = 'smkaufman@gmail.com');