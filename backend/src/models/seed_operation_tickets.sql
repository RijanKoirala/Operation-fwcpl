-- ============================================================
-- SEED HISTORICAL OPERATION CENTER TICKETS (FROM EXCEL)
-- ============================================================

-- Ensure Branches Exist
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-001', 'Arjundhara Branch', '9801708976', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-002', 'Arunkhola Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-003', 'Bailbas Branch', '9854036982', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-004', 'Baluwatar Branch', '9802353963', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-005', 'Belbari Branch', '9801417863', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-006', 'Bhedabari Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-007', 'Bhutaha/Bardaghat Branch', '9801599137', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-008', 'Biratchowk Branch', '9801417863', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-009', 'Bolochowk Branch', '9801614711', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-010', 'Budhabare Branch', '9801708976', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-011', 'Bulingtar Branch', '9849596029', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-012', 'Chormara Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-013', 'Damak Branch', '9705417902', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-014', 'Damauli Branch', '9714524181', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-015', 'Dhangadhi Branch', '9801827198', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-016', 'Dudhe Branch', '9801417740', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-017', 'Dumkibas Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-018', 'Gaidakot Branch', '9801975185', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-019', 'Gajehada Branch', '9705855123', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-020', 'Gokarna Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-021', 'Goldhap Branch', '9801615077', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-022', 'Hupsikot Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-023', 'Itahari Branch', '9705417905', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-024', 'Jitpur Branch', '9705855123', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-025', 'Kanchan Branch', '9705855123', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-026', 'Katari Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-027', 'Kawasoti Branch', '9802890048', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-028', 'Kerabari Branch', '9801417863', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-029', 'Kerkha Branch', '9705417902', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-030', 'Lolang Branch', '9802353963', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-031', 'Machhapokhari Branch', '9802353963', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-032', 'Narayangarh Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-033', 'Pathari Branch (All)', '9709162008', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-034', 'Pharsatikar Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-035', 'Pithauli Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-036', 'Pokhara Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-037', 'Rajhar/Daldale Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-038', 'Sundar-Bazzar Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-039', 'Sunwal Branch', '9801567344', 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-040', 'Sworna Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-041', 'Thankot Branch', NULL, 'Active') ON CONFLICT DO NOTHING;
INSERT INTO branches (code, name, contact_number, status) VALUES ('BR-042', 'Operation HQ', NULL, 'Active') ON CONFLICT DO NOTHING;

-- Ensure Operation HQ exists
INSERT INTO branches (code, name, status) VALUES ('BR-HQ', 'Operation HQ', 'Active') ON CONFLICT DO NOTHING;

-- Insert Tickets
DO 45778
DECLARE
  v_user_id INTEGER;
  v_branch_id INTEGER;
  v_ticket_id INTEGER;
BEGIN
  -- Get default user
  SELECT id INTO v_user_id FROM users WHERE LOWER(username) = 'surendra' OR LOWER(full_name) LIKE '%surendra%' LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE role = 'SUPER_ADMIN' OR username = 'superadmin' ORDER BY id ASC LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users ORDER BY id ASC LIMIT 1;
  END IF;

  -- Ticket #1 (1)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'iptv box navayra new connection pending' AND created_at = '2026-09-08 15:14:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Urgent', 'iptv box navayra new connection pending', 'iptv box navayra new connection pending',
      'CLOSED', 'Action Taken: forwarded stock department | Remarks: iptv box no stock', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-08 15:14:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-08 15:14:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 15:14:00'::timestamp);
  END IF;

  -- Ticket #2 (2)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net stable china slow issue' AND created_at = '2026-09-08 15:22:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net stable china slow issue', 'net stable china slow issue',
      'CLOSED', 'Action Taken: forwarded noc team | Remarks: staff and noc team coordination', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-08 15:22:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-08 15:22:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 15:22:00'::timestamp);
  END IF;

  -- Ticket #3 (3)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pharsatikar Branch') OR LOWER(name) = LOWER('Pharsatikar') OR LOWER(name) LIKE '%pharsatikar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'need for fiber 5 km' AND created_at = '2026-09-08 15:34:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'need for fiber 5 km', 'need for fiber 5 km',
      'IN_PROGRESS', 'Action Taken: forwaedwd stock department | Remarks: fiber no stock', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-08 15:34:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-08 15:34:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 15:34:00'::timestamp);
  END IF;

  -- Ticket #4 (4)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerabari Branch') OR LOWER(name) = LOWER('Kerabari') OR LOWER(name) LIKE '%kerabari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine bigreko arko machine pathauna' AND created_at = '2026-09-08 15:46:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine bigreko arko machine pathauna', 'machine bigreko arko machine pathauna',
      'CLOSED', 'Action Taken: forwaedwd stock department | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-08 15:46:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-08 15:46:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 15:46:00'::timestamp);
  END IF;

  -- Ticket #5 (5)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'fiber ma isuue need 3/4 k.m fiber' AND created_at = '2026-09-08 16:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'fiber ma isuue need 3/4 k.m fiber', 'fiber ma isuue need 3/4 k.m fiber',
      'CLOSED', 'Action Taken: forwaedwd stock department | Remarks: fiber received', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-08 16:10:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-08 16:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 16:10:00'::timestamp);
  END IF;

  -- Ticket #6 (6)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pithauli Branch') OR LOWER(name) = LOWER('Pithauli') OR LOWER(name) LIKE '%pithauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net solw issue' AND created_at = '2026-09-08 16:42:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net solw issue', 'net solw issue',
      'CLOSED', 'Action Taken: forwarded noc team | Remarks: staff and noc team coordination solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-08 16:42:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-08 16:42:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 16:42:00'::timestamp);
  END IF;

  -- Ticket #7 (7)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gokarna Branch') OR LOWER(name) = LOWER('Gokarna') OR LOWER(name) LIKE '%gokarna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike tyre change garana napayra pending work' AND created_at = '2026-09-08 16:50:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'bike tyre change garana napayra pending work', 'bike tyre change garana napayra pending work',
      'CLOSED', 'Action Taken: forward finance team | Remarks: tyre change garana 4k lagaxa ray inform group ma me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-08 18:00:00'::timestamp, '2026-09-08 16:50:00'::timestamp, COALESCE('2026-09-08 18:00:00'::timestamp, '2026-09-08 16:50:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 16:50:00'::timestamp);
  END IF;

  -- Ticket #8 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Operation HQ') OR LOWER(name) = LOWER('Operation HQ') OR LOWER(name) LIKE '%operation hq%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'sabi branch bata net slow ko isuue aako cha' AND created_at = '2026-09-08 10:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Urgent', 'sabi branch bata net slow ko isuue aako cha', 'sabi branch bata net slow ko isuue aako cha',
      'CLOSED', 'Action Taken: forward noc team | Remarks: noc team saga bujada 2/3 din aagadi ko problem vannu vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-08 18:00:00'::timestamp, '2026-09-08 10:00:00'::timestamp, COALESCE('2026-09-08 18:00:00'::timestamp, '2026-09-08 10:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 10:00:00'::timestamp);
  END IF;

  -- Ticket #9 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dhangadhi Branch') OR LOWER(name) = LOWER('Dhangadhi') OR LOWER(name) LIKE '%dhangadhi%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dhagadi branch ko chitije sir aja bata kam aaudina vannu vako cha' AND created_at = '2026-09-08 10:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'High', 'dhagadi branch ko chitije sir aja bata kam aaudina vannu vako cha', 'dhagadi branch ko chitije sir aja bata kam aaudina vannu vako cha',
      'CLOSED', 'Action Taken: forward operation and finace team | Remarks: join next  company', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-08 10:00:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-08 10:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 10:00:00'::timestamp);
  END IF;

  -- Ticket #10 (8)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine bigreko repaire need' AND created_at = '2026-09-08 17:37:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine bigreko repaire need', 'machine bigreko repaire need',
      'CLOSED', 'Action Taken: receivdd head office | Remarks: solve ashok sir', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-08 18:00:00'::timestamp, '2026-09-08 17:37:00'::timestamp, COALESCE('2026-09-08 18:00:00'::timestamp, '2026-09-08 17:37:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-08 17:37:00'::timestamp);
  END IF;

  -- Ticket #11 (9)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam hudai ch...' AND created_at = '2026-09-09 10:33:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam hudai ch...', 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam hudai cha',
      'CLOSED', 'Remarks: complect work', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 10:33:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 10:33:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 10:33:00'::timestamp);
  END IF;

  -- Ticket #12 (10)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Thankot Branch') OR LOWER(name) = LOWER('Thankot') OR LOWER(name) LIKE '%thankot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net stable china slow issue and deposit issue' AND created_at = '2026-09-09 10:44:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net stable china slow issue and deposit issue', 'net stable china slow issue and deposit issue',
      'CLOSED', 'Action Taken: forward noc team and finace team | Remarks: no issue this time', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 10:44:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 10:44:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 10:44:00'::timestamp);
  END IF;

  -- Ticket #13 (11)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'zc 521 router ma maximum slow issue and new connection ko lagi offer d...' AND created_at = '2026-09-09 11:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'zc 521 router ma maximum slow issue and new connection ko lagi offer d...', 'zc 521 router ma maximum slow issue and new connection ko lagi offer demand and marekting',
      'CLOSED', 'Action Taken: forwarded stock department | Remarks: inform ashok sir', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 11:10:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 11:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 11:10:00'::timestamp);
  END IF;

  -- Ticket #14 (12)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerabari Branch') OR LOWER(name) = LOWER('Kerabari') OR LOWER(name) LIKE '%kerabari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'huwai router ma problem' AND created_at = '2026-09-09 11:28:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'huwai router ma problem', 'huwai router ma problem',
      'CLOSED', 'Action Taken: forward noc team | Remarks: coordination noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-09 11:28:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-09 11:28:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 11:28:00'::timestamp);
  END IF;

  -- Ticket #15 (13)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'jitpur network ma issue vayara repair hunay kam hudai cha' AND created_at = '2026-09-09 11:38:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Medium', 'jitpur network ma issue vayara repair hunay kam hudai cha', 'jitpur network ma issue vayara repair hunay kam hudai cha',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 11:38:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 11:38:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 11:38:00'::timestamp);
  END IF;

  -- Ticket #16 (14)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kuncha bijay pur olt vako  ghar ma ups ma problem vaya ko lay' AND created_at = '2026-09-09 11:48:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'kuncha bijay pur olt vako  ghar ma ups ma problem vaya ko lay', 'kuncha bijay pur olt vako  ghar ma ups ma problem vaya ko lay',
      'CLOSED', 'Action Taken: forwarded stock department | Remarks: solved', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 11:48:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 11:48:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 11:48:00'::timestamp);
  END IF;

  -- Ticket #17 (15)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bailbas Branch') OR LOWER(name) = LOWER('Bailbas') OR LOWER(name) LIKE '%bailbas%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue maximum coustumer /price issue new connection effect' AND created_at = '2026-09-09 11:58:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'net slow issue maximum coustumer /price issue new connection effect', 'net slow issue maximum coustumer /price issue new connection effect',
      'CLOSED', 'Action Taken: forward noc team | Remarks: coordination noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 11:58:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 11:58:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 11:58:00'::timestamp);
  END IF;

  -- Ticket #18 (16)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bhutaha/Bardaghat Branch') OR LOWER(name) = LOWER('Bhutaha/Bardaghat') OR LOWER(name) LIKE '%bhutaha/bardaghat%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'new connection offer demend' AND created_at = '2026-09-09 12:09:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'new connection offer demend', 'new connection offer demend',
      'CLOSED', 'Remarks: closed', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 12:09:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 12:09:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 12:09:00'::timestamp);
  END IF;

  -- Ticket #19 (17)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sunwal Branch') OR LOWER(name) = LOWER('Sunwal') OR LOWER(name) LIKE '%sunwal%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'new slow issue and bhabhindar sir and ramchandra sir filed vigit' AND created_at = '2026-09-09 12:27:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Medium', 'new slow issue and bhabhindar sir and ramchandra sir filed vigit', 'new slow issue and bhabhindar sir and ramchandra sir filed vigit',
      'CLOSED', 'Action Taken: forward noc team | Remarks: coordination noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-09 12:27:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-09 12:27:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 12:27:00'::timestamp);
  END IF;

  -- Ticket #20 (18)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine tools need c date router problem' AND created_at = '2026-09-09 13:08:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine tools need c date router problem', 'machine tools need c date router problem',
      'CLOSED', 'Action Taken: forwarded stock department | Remarks: c data problem solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 13:08:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 13:08:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 13:08:00'::timestamp);
  END IF;

  -- Ticket #21 (19)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine demand  inform rajesh sir' AND created_at = '2026-09-09 14:23:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'machine demand  inform rajesh sir', 'machine demand  inform rajesh sir',
      'IN_PROGRESS', 'Action Taken: forwarded stock department', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-09 14:23:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-09 14:23:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 14:23:00'::timestamp);
  END IF;

  -- Ticket #22 (20)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Belbari Branch') OR LOWER(name) = LOWER('Belbari') OR LOWER(name) LIKE '%belbari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'need fiber trumn link and camera ko lagi' AND created_at = '2026-09-09 14:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'need fiber trumn link and camera ko lagi', 'need fiber trumn link and camera ko lagi',
      'IN_PROGRESS', NULL, CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-09 14:35:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-09 14:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 14:35:00'::timestamp);
  END IF;

  -- Ticket #23 (21)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dhangadhi Branch') OR LOWER(name) = LOWER('Dhangadhi') OR LOWER(name) LIKE '%dhangadhi%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'need new sfaff' AND created_at = '2026-09-09 14:51:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'High', 'need new sfaff', 'need new sfaff',
      'CLOSED', 'Action Taken: forwarded stock department', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 14:51:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 14:51:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 14:51:00'::timestamp);
  END IF;

  -- Ticket #24 (22)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Machhapokhari Branch') OR LOWER(name) = LOWER('Machhapokhari') OR LOWER(name) LIKE '%machhapokhari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'need staff staff navayara power mantian kam pending' AND created_at = '2026-09-09 16:30:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'need staff staff navayara power mantian kam pending', 'need staff staff navayara power mantian kam pending',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 16:30:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 16:30:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 16:30:00'::timestamp);
  END IF;

  -- Ticket #25 (23)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damak Branch') OR LOWER(name) = LOWER('Damak') OR LOWER(name) LIKE '%damak%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'last time 5500  ma conecction vako yearly7500 vayara renew ma problem' AND created_at = '2026-09-09 16:37:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Revenue', 'Medium', 'last time 5500  ma conecction vako yearly7500 vayara renew ma problem', 'last time 5500  ma conecction vako yearly7500 vayara renew ma problem',
      'CLOSED', 'Action Taken: forward finace team | Remarks: cooradination finance team and solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-09 16:37:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-09 16:37:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 16:37:00'::timestamp);
  END IF;

  -- Ticket #26 (24)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Goldhap Branch') OR LOWER(name) = LOWER('Goldhap') OR LOWER(name) LIKE '%goldhap%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue maximum coutumer' AND created_at = '2026-09-09 16:50:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net slow issue maximum coutumer', 'net slow issue maximum coutumer',
      'CLOSED', 'Action Taken: forward noc team | Remarks: noc team saga bujada power isssue', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-09 16:50:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-09 16:50:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 16:50:00'::timestamp);
  END IF;

  -- Ticket #27 (25)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'morning time 7.30 to 8.00 time net slow' AND created_at = '2026-09-09 16:55:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'morning time 7.30 to 8.00 time net slow', 'morning time 7.30 to 8.00 time net slow',
      'CLOSED', 'Action Taken: forward noc team | Remarks: noc team saga any desk diyara checking', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-09 16:55:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-09 16:55:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 16:55:00'::timestamp);
  END IF;

  -- Ticket #28 (26)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = '3 time call garay ko received vayana' AND created_at = '2026-09-09 16:57:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', '3 time call garay ko received vayana', '3 time call garay ko received vayana',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 16:57:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 16:57:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 16:57:00'::timestamp);
  END IF;

  -- Ticket #29 (27)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'call not received' AND created_at = '2026-09-09 17:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'call not received', 'call not received',
      'CLOSED', 'Remarks: voli follow up hunaxa kina call received navako raiax', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 17:00:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 17:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 17:00:00'::timestamp);
  END IF;

  -- Ticket #30 (28)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Arjundhara Branch') OR LOWER(name) = LOWER('Arjundhara') OR LOWER(name) LIKE '%arjundhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'call not received' AND created_at = '2026-09-09 17:03:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'call not received', 'call not received',
      'CLOSED', 'Remarks: voli follow up hunaxa kina call received navako raiax', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 17:03:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 17:03:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 17:03:00'::timestamp);
  END IF;

  -- Ticket #31 (29)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no complain' AND created_at = '2026-09-09 17:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no complain', 'no complain',
      'CLOSED', 'Remarks: voli follow up hunaxa kina call received navako raiax', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 17:05:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 17:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 17:05:00'::timestamp);
  END IF;

  -- Ticket #32 (30)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sworna Branch') OR LOWER(name) = LOWER('Sworna') OR LOWER(name) LIKE '%sworna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no  call received' AND created_at = '2026-09-09 17:06:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no  call received', 'no  call received',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 17:06:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 17:06:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 17:06:00'::timestamp);
  END IF;

  -- Ticket #33 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Operation HQ') OR LOWER(name) = LOWER('Operation HQ') OR LOWER(name) LIKE '%operation hq%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'jati pani branch lai follow up vayo maximum branc bata new slow ko iss...' AND created_at = '2026-09-09 17:12:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'jati pani branch lai follow up vayo maximum branc bata new slow ko iss...', 'jati pani branch lai follow up vayo maximum branc bata new slow ko issue dheari aako cha',
      'CLOSED', 'Action Taken: forward noc team | Remarks: noc team lay branch saga cooradinatomn garanu huncha vanny answer ayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-09 18:00:00'::timestamp, '2026-09-09 17:12:00'::timestamp, COALESCE('2026-09-09 18:00:00'::timestamp, '2026-09-09 17:12:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-09 17:12:00'::timestamp);
  END IF;

  -- Ticket #34 (31)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'hejo ko chtayang lay fan bigayako co need fan' AND created_at = '2026-09-10 10:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Low', 'hejo ko chtayang lay fan bigayako co need fan', 'hejo ko chtayang lay fan bigayako co need fan',
      'CLOSED', 'Action Taken: forward stock team | Remarks: noraml saman change', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 10:10:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 10:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 10:10:00'::timestamp);
  END IF;

  -- Ticket #35 (32)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'joro aako lay leave ma hunuhuncha' AND created_at = '2026-09-10 10:12:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'joro aako lay leave ma hunuhuncha', 'joro aako lay leave ma hunuhuncha',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 10:12:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 10:12:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 10:12:00'::timestamp);
  END IF;

  -- Ticket #36 (33)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike ma problem aaya ko kam pending' AND created_at = '2026-09-10 10:18:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'bike ma problem aaya ko kam pending', 'bike ma problem aaya ko kam pending',
      'CLOSED', 'Action Taken: forward finace team | Remarks: solve vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-10 10:18:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-10 10:18:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 10:18:00'::timestamp);
  END IF;

  -- Ticket #37 (34)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damak Branch') OR LOWER(name) = LOWER('Damak') OR LOWER(name) LIKE '%damak%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = '2 ta machine ma issue vayera maintanance garna kathmandu pathayako chh...' AND created_at = '2026-09-10 10:40:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', '2 ta machine ma issue vayera maintanance garna kathmandu pathayako chh...', '2 ta machine ma issue vayera maintanance garna kathmandu pathayako chha kura bujera agadi badauna paryo',
      'CLOSED', 'Action Taken: forward stock depertement | Remarks: mother board change garna 30k lagnay vayra exchange garany kura vako raixa ashok sir saga machine board ma cha aauna time lagax', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 10:40:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 10:40:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 10:40:00'::timestamp);
  END IF;

  -- Ticket #38 (35)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'salary 10% badayra aaunay kura vko thyo ray sandeep sir saga badayra a...' AND created_at = '2026-09-10 12:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Urgent', 'salary 10% badayra aaunay kura vko thyo ray sandeep sir saga badayra a...', 'salary 10% badayra aaunay kura vko thyo ray sandeep sir saga badayra aayana vanay kam ma aaudina vandai hunuhucha ray aru no issue',
      'IN_PROGRESS', 'Action Taken: forward finance tem', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-10 12:10:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-10 12:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 12:10:00'::timestamp);
  END IF;

  -- Ticket #39 (36)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'iptv box navayra new connection pending and net slow issue' AND created_at = '2026-09-10 12:23:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'iptv box navayra new connection pending and net slow issue', 'iptv box navayra new connection pending and net slow issue',
      'CLOSED', 'Action Taken: forward noc team an d stock team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 12:23:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 12:23:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 12:23:00'::timestamp);
  END IF;

  -- Ticket #40 (3)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Arjundhara Branch') OR LOWER(name) = LOWER('Arjundhara') OR LOWER(name) LIKE '%arjundhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no isuue and new connection kasari badaunay plan garanu vanay ko chu' AND created_at = '2026-09-10 12:30:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no isuue and new connection kasari badaunay plan garanu vanay ko chu', 'no isuue and new connection kasari badaunay plan garanu vanay ko chu',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 12:30:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 12:30:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 12:30:00'::timestamp);
  END IF;

  -- Ticket #41 (37)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sworna Branch') OR LOWER(name) = LOWER('Sworna') OR LOWER(name) LIKE '%sworna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'call received navayara group ma inform garay ko chu' AND created_at = '2026-09-10 12:49:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'call received navayara group ma inform garay ko chu', 'call received navayara group ma inform garay ko chu',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 12:49:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 12:49:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 12:49:00'::timestamp);
  END IF;

  -- Ticket #42 (38)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'chindada ko olt ma chatyang parako belama otl nai damage hunay vayako ...' AND created_at = '2026-09-10 12:57:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'chindada ko olt ma chatyang parako belama otl nai damage hunay vayako ...', 'chindada ko olt ma chatyang parako belama otl nai damage hunay vayako lay  earthing garanu parxa vannu vako cha',
      'CLOSED', 'Action Taken: forward stock depertement | Remarks: saman pathuda yata bata sagai pathidinu hunxa', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 12:57:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 12:57:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 12:57:00'::timestamp);
  END IF;

  -- Ticket #43 (39)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bulingtar Branch') OR LOWER(name) = LOWER('Bulingtar') OR LOWER(name) LIKE '%bulingtar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bulingtar office ko lagi ups and bettry need' AND created_at = '2026-09-10 13:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'bulingtar office ko lagi ups and bettry need', 'bulingtar office ko lagi ups and bettry need',
      'CLOSED', 'Action Taken: forward stock depertement | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-22 18:00:00'::timestamp, '2026-09-10 13:10:00'::timestamp, COALESCE('2026-09-22 18:00:00'::timestamp, '2026-09-10 13:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 13:10:00'::timestamp);
  END IF;

  -- Ticket #44 (40)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damauli Branch') OR LOWER(name) = LOWER('Damauli') OR LOWER(name) LIKE '%damauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'router pathauda 2.4g pathunu vannu vayo and paheal ko vanda net slow' AND created_at = '2026-09-10 13:49:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'router pathauda 2.4g pathunu vannu vayo and paheal ko vanda net slow', 'router pathauda 2.4g pathunu vannu vayo and paheal ko vanda net slow',
      'CLOSED', 'Action Taken: forwward stock ad noc team | Remarks: 2.4g router out off stocked ana inform net slow issue inform noc', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 13:49:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 13:49:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 13:49:00'::timestamp);
  END IF;

  -- Ticket #45 (41)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kanchna jitpurt gagheda barnck ko lagi odtr 1 pic' AND created_at = '2026-09-10 15:30:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'kanchna jitpurt gagheda barnck ko lagi odtr 1 pic', 'kanchna jitpurt gagheda barnck ko lagi odtr 1 pic',
      'IN_PROGRESS', 'Action Taken: forwward stock ad noc team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-10 15:30:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-10 15:30:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 15:30:00'::timestamp);
  END IF;

  -- Ticket #46 (42)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sunwal Branch') OR LOWER(name) = LOWER('Sunwal') OR LOWER(name) LIKE '%sunwal%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dimond kater need' AND created_at = '2026-09-10 16:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'dimond kater need', 'dimond kater need',
      'CLOSED', 'Action Taken: forwward stock ad noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-10 16:10:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-10 16:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 16:10:00'::timestamp);
  END IF;

  -- Ticket #47 (43)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'purchaed bike damak bata sandeep sir lay pathunu vako' AND created_at = '2026-09-10 17:32:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'purchaed bike damak bata sandeep sir lay pathunu vako', 'purchaed bike damak bata sandeep sir lay pathunu vako',
      'CLOSED', 'Action Taken: forwward stock ad noc team | Remarks: team lai bike navayara pathunu vako', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-10 17:32:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-10 17:32:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-10 17:32:00'::timestamp);
  END IF;

  -- Ticket #48 (44)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damauli Branch') OR LOWER(name) = LOWER('Damauli') OR LOWER(name) LIKE '%damauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'ghar janu vayako lay aja leave ma hunuhuncha' AND created_at = '2026-09-11 10:33:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'ghar janu vayako lay aja leave ma hunuhuncha', 'ghar janu vayako lay aja leave ma hunuhuncha',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 10:33:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 10:33:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 10:33:00'::timestamp);
  END IF;

  -- Ticket #49 (45)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'family problem vayara 1 week leave ma hunuhuncha[26 to 3]' AND created_at = '2026-09-11 10:45:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'family problem vayara 1 week leave ma hunuhuncha[26 to 3]', 'family problem vayara 1 week leave ma hunuhuncha[26 to 3]',
      'CLOSED', 'Action Taken: mail and inform me | Remarks: mail and inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 10:45:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 10:45:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 10:45:00'::timestamp);
  END IF;

  -- Ticket #50 (46)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sworna Branch') OR LOWER(name) = LOWER('Sworna') OR LOWER(name) LIKE '%sworna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'epone 16 port olt ko thu ma xpone 16 port ko olt demnad and zc 521 5g ...' AND created_at = '2026-09-11 11:03:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'epone 16 port olt ko thu ma xpone 16 port ko olt demnad and zc 521 5g ...', 'epone 16 port olt ko thu ma xpone 16 port ko olt demnad and zc 521 5g ma net slow issu',
      'IN_PROGRESS', 'Action Taken: forward stock depertement | Remarks: yo kura paheal rajesh sir saga pani vako thyo vannu vako cha', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-11 11:03:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-11 11:03:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 11:03:00'::timestamp);
  END IF;

  -- Ticket #51 (47)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'wifi 5 router ma connect and disconnect proglam so exchange demand' AND created_at = '2026-09-11 11:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'wifi 5 router ma connect and disconnect proglam so exchange demand', 'wifi 5 router ma connect and disconnect proglam so exchange demand',
      'CLOSED', 'Action Taken: forward stock depertement', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 11:10:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 11:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 11:10:00'::timestamp);
  END IF;

  -- Ticket #52 (48)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dudhe to kakani link down fiber navayar aja pani link up hunna vannu v...' AND created_at = '2026-09-11 11:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'dudhe to kakani link down fiber navayar aja pani link up hunna vannu v...', 'dudhe to kakani link down fiber navayar aja pani link up hunna vannu vako cha so 1 km fiber emegency need',
      'CLOSED', 'Action Taken: forward stock depertement | Remarks: sandeep sir lay manage fiber solve problem', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 11:20:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 11:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 11:20:00'::timestamp);
  END IF;

  -- Ticket #53 (49)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'mirchiya ko swich din ma 2/3 patak remoot hunay vayako lay net ma issu...' AND created_at = '2026-09-11 11:36:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'mirchiya ko swich din ma 2/3 patak remoot hunay vayako lay net ma issu...', 'mirchiya ko swich din ma 2/3 patak remoot hunay vayako lay net ma issue',
      'CLOSED', 'Action Taken: forward ashok sir to sunil sir | Remarks: staff banauna janu vako cha vanny inform aako thyo  so', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 11:36:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 11:36:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 11:36:00'::timestamp);
  END IF;

  -- Ticket #54 (50)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'gaidakot brncha ma issue vayakolay staff teta janu vako cha' AND created_at = '2026-09-11 12:13:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'gaidakot brncha ma issue vayakolay staff teta janu vako cha', 'gaidakot brncha ma issue vayakolay staff teta janu vako cha',
      'CLOSED', 'Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 12:13:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 12:13:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 12:13:00'::timestamp);
  END IF;

  -- Ticket #55 (51)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kanchan Branch') OR LOWER(name) = LOWER('Kanchan') OR LOWER(name) LIKE '%kanchan%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'presonal scoketi usge demand service charge' AND created_at = '2026-09-11 12:31:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Billing', 'Medium', 'presonal scoketi usge demand service charge', 'presonal scoketi usge demand service charge',
      'CLOSED', 'Action Taken: forward stock depertement', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 12:31:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 12:31:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 12:31:00'::timestamp);
  END IF;

  -- Ticket #56 (52)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'pargatinagar to bharatpur link down' AND created_at = '2026-09-11 12:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'pargatinagar to bharatpur link down', 'pargatinagar to bharatpur link down',
      'CLOSED', 'Action Taken: inform the gaidakot staff | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-10 18:00:00'::timestamp, '2026-09-11 12:35:00'::timestamp, COALESCE('2026-09-10 18:00:00'::timestamp, '2026-09-11 12:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 12:35:00'::timestamp);
  END IF;

  -- Ticket #57 (53)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'joro aako lay aja pani ofiice aaunu vayana' AND created_at = '2026-09-11 13:40:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'joro aako lay aja pani ofiice aaunu vayana', 'joro aako lay aja pani ofiice aaunu vayana',
      'CLOSED', 'Action Taken: inform me | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-11 18:00:00'::timestamp, '2026-09-11 13:40:00'::timestamp, COALESCE('2026-09-11 18:00:00'::timestamp, '2026-09-11 13:40:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 13:40:00'::timestamp);
  END IF;

  -- Ticket #58 (54)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bulingtar Branch') OR LOWER(name) = LOWER('Bulingtar') OR LOWER(name) LIKE '%bulingtar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bulingtar office fron desk ko lagi office decoration garanay demand' AND created_at = '2026-09-11 13:55:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'bulingtar office fron desk ko lagi office decoration garanay demand', 'bulingtar office fron desk ko lagi office decoration garanay demand',
      'IN_PROGRESS', NULL, CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-11 13:55:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-11 13:55:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 13:55:00'::timestamp);
  END IF;

  -- Ticket #59 (55)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'ashesh dhamal staff ko bike ko full engin badanu parnay vaya ko 10 to ...' AND created_at = '2026-09-11 14:04:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'High', 'ashesh dhamal staff ko bike ko full engin badanu parnay vaya ko 10 to ...', 'ashesh dhamal staff ko bike ko full engin badanu parnay vaya ko 10 to 15k kharcha aaunay vayako lay office lay half payment ko request garanu vako cha',
      'IN_PROGRESS', 'Action Taken: forward finace team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-11 14:04:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-11 14:04:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-11 14:04:00'::timestamp);
  END IF;

  -- Ticket #60 (56)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pithauli Branch') OR LOWER(name) = LOWER('Pithauli') OR LOWER(name) LIKE '%pithauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue' AND created_at = '2026-09-13 10:11:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net slow issue', 'net slow issue',
      'CLOSED', 'Action Taken: forward noc team | Remarks: satrurday ko issue ko corrdinaton noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 10:11:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 10:11:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 10:11:00'::timestamp);
  END IF;

  -- Ticket #61 (57)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Thankot Branch') OR LOWER(name) = LOWER('Thankot') OR LOWER(name) LIKE '%thankot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'scooter accident vaayara aja 1 day rest ma hunuhuncha out off office w...' AND created_at = '2026-09-13 10:28:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'scooter accident vaayara aja 1 day rest ma hunuhuncha out off office w...', 'scooter accident vaayara aja 1 day rest ma hunuhuncha out off office work time',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 10:28:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 10:28:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 10:28:00'::timestamp);
  END IF;

  -- Ticket #62 (58)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = '2 ta shine bill book nai xaina and 3 year renew fail' AND created_at = '2026-09-13 10:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', '2 ta shine bill book nai xaina and 3 year renew fail', '2 ta shine bill book nai xaina and 3 year renew fail',
      'IN_PROGRESS', 'Action Taken: forward finace team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-13 10:35:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-13 10:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 10:35:00'::timestamp);
  END IF;

  -- Ticket #63 (59)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'jitpur brancha ma db box ko kam vayako lay ladder need' AND created_at = '2026-09-13 10:45:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'jitpur brancha ma db box ko kam vayako lay ladder need', 'jitpur brancha ma db box ko kam vayako lay ladder need',
      'IN_PROGRESS', 'Action Taken: forward stock team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-13 10:45:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-13 10:45:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 10:45:00'::timestamp);
  END IF;

  -- Ticket #64 (60)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bhutaha/Bardaghat Branch') OR LOWER(name) = LOWER('Bhutaha/Bardaghat') OR LOWER(name) LIKE '%bhutaha/bardaghat%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'tvs scooketi bill book xaina' AND created_at = '2026-09-13 10:55:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'tvs scooketi bill book xaina', 'tvs scooketi bill book xaina',
      'IN_PROGRESS', NULL, CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-13 10:55:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-13 10:55:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 10:55:00'::timestamp);
  END IF;

  -- Ticket #65 (61)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'aja ra voli pani bida ma hunuhuna cha tej manauna maita janu vako cha ...' AND created_at = '2026-09-13 11:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'aja ra voli pani bida ma hunuhuna cha tej manauna maita janu vako cha ...', 'aja ra voli pani bida ma hunuhuna cha tej manauna maita janu vako cha ray',
      'CLOSED', 'Action Taken: hari sir lai inform garanu vako cha ray', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 11:05:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 11:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 11:05:00'::timestamp);
  END IF;

  -- Ticket #66 (62)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kanchan Branch') OR LOWER(name) = LOWER('Kanchan') OR LOWER(name) LIKE '%kanchan%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'id card navayara filed ma kam garana garo vako cha ray' AND created_at = '2026-09-13 11:13:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'id card navayara filed ma kam garana garo vako cha ray', 'id card navayara filed ma kam garana garo vako cha ray',
      'CLOSED', 'Action Taken: banaunu vandiya ko chu', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 11:13:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 11:13:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 11:13:00'::timestamp);
  END IF;

  -- Ticket #67 (63)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'shiva ganga to chindada ma new pol halnay kam vayakolay morning time b...' AND created_at = '2026-09-13 11:17:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'shiva ganga to chindada ma new pol halnay kam vayakolay morning time b...', 'shiva ganga to chindada ma new pol halnay kam vayakolay morning time bata kam garanu vako cha staff lay',
      'CLOSED', 'Action Taken: inform me and group | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 11:17:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 11:17:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 11:17:00'::timestamp);
  END IF;

  -- Ticket #68 (64)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerabari Branch') OR LOWER(name) = LOWER('Kerabari') OR LOWER(name) LIKE '%kerabari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'new receptionist join alina rai' AND created_at = '2026-09-13 11:24:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'new receptionist join alina rai', 'new receptionist join alina rai',
      'CLOSED', 'Action Taken: inform hr dep | Remarks: mail operations and finace group', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 11:24:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 11:24:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 11:24:00'::timestamp);
  END IF;

  -- Ticket #69 (65)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pharsatikar Branch') OR LOWER(name) = LOWER('Pharsatikar') OR LOWER(name) LIKE '%pharsatikar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'shine bike no bill book' AND created_at = '2026-09-13 11:39:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'shine bike no bill book', 'shine bike no bill book',
      'IN_PROGRESS', NULL, CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-13 11:39:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-13 11:39:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 11:39:00'::timestamp);
  END IF;

  -- Ticket #70 (66)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine problem repair need' AND created_at = '2026-09-13 12:09:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine problem repair need', 'machine problem repair need',
      'CLOSED', 'Action Taken: forward stock team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 12:09:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 12:09:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 12:09:00'::timestamp);
  END IF;

  -- Ticket #71 (67)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bolochowk Branch') OR LOWER(name) = LOWER('Bolochowk') OR LOWER(name) LIKE '%bolochowk%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'sabai thik cha no issue' AND created_at = '2026-09-13 14:19:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'sabai thik cha no issue', 'sabai thik cha no issue',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-13 18:00:00'::timestamp, '2026-09-13 14:19:00'::timestamp, COALESCE('2026-09-13 18:00:00'::timestamp, '2026-09-13 14:19:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-13 14:19:00'::timestamp);
  END IF;

  -- Ticket #72 (68)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bhutaha/Bardaghat Branch') OR LOWER(name) = LOWER('Bhutaha/Bardaghat') OR LOWER(name) LIKE '%bhutaha/bardaghat%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bida ma ghar aaunu vako cha ghar aako bela ma pithuali brnch visit' AND created_at = '2026-09-14 10:04:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'bida ma ghar aaunu vako cha ghar aako bela ma pithuali brnch visit', 'bida ma ghar aaunu vako cha ghar aako bela ma pithuali brnch visit',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-14 18:00:00'::timestamp, '2026-09-14 10:04:00'::timestamp, COALESCE('2026-09-14 18:00:00'::timestamp, '2026-09-14 10:04:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 10:04:00'::timestamp);
  END IF;

  -- Ticket #73 (69)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'hajurbuwa bitnu vako 1 year ko kam ma janu parnay vayako lay' AND created_at = '2026-09-14 10:07:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'hajurbuwa bitnu vako 1 year ko kam ma janu parnay vayako lay', 'hajurbuwa bitnu vako 1 year ko kam ma janu parnay vayako lay',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-14 18:00:00'::timestamp, '2026-09-14 10:07:00'::timestamp, COALESCE('2026-09-14 18:00:00'::timestamp, '2026-09-14 10:07:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 10:07:00'::timestamp);
  END IF;

  -- Ticket #74 (70)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gokarna Branch') OR LOWER(name) = LOWER('Gokarna') OR LOWER(name) LIKE '%gokarna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kageswori mandir ma program huna lagay ko lay 1 week ko lagi net free ...' AND created_at = '2026-09-14 11:02:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'kageswori mandir ma program huna lagay ko lay 1 week ko lagi net free ...', 'kageswori mandir ma program huna lagay ko lay 1 week ko lagi net free ma dinu  vanny demand',
      'CLOSED', 'Action Taken: inform finance team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-14 11:02:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-14 11:02:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 11:02:00'::timestamp);
  END IF;

  -- Ticket #75 (71)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine head office received' AND created_at = '2026-09-14 23:25:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Low', 'machine head office received', 'machine head office received',
      'CLOSED', 'Action Taken: inform stock dep and me | Remarks: machine ashok sir lay banayara stock team lau dudhay branch pathunu vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-14 23:25:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-14 23:25:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 23:25:00'::timestamp);
  END IF;

  -- Ticket #76 (72)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'tvs radeon bike  ko no bill book used filed' AND created_at = '2026-09-14 23:43:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'tvs radeon bike  ko no bill book used filed', 'tvs radeon bike  ko no bill book used filed',
      'IN_PROGRESS', 'Action Taken: inform finance team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-14 23:43:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-14 23:43:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 23:43:00'::timestamp);
  END IF;

  -- Ticket #77 (73)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike number ga 11 pa 4024 tyre change garanu parnay' AND created_at = '2026-09-14 11:53:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'bike number ga 11 pa 4024 tyre change garanu parnay', 'bike number ga 11 pa 4024 tyre change garanu parnay',
      'CLOSED', 'Action Taken: inform finance team | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-19 18:00:00'::timestamp, '2026-09-14 11:53:00'::timestamp, COALESCE('2026-09-19 18:00:00'::timestamp, '2026-09-14 11:53:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 11:53:00'::timestamp);
  END IF;

  -- Ticket #78 (74)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kaki ko death vayara 13 din kam sakayra matra office aaunu hunxa' AND created_at = '2026-09-14 12:01:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'kaki ko death vayara 13 din kam sakayra matra office aaunu hunxa', 'kaki ko death vayara 13 din kam sakayra matra office aaunu hunxa',
      'CLOSED', 'Action Taken: inform me with call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-14 18:00:00'::timestamp, '2026-09-14 12:01:00'::timestamp, COALESCE('2026-09-14 18:00:00'::timestamp, '2026-09-14 12:01:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 12:01:00'::timestamp);
  END IF;

  -- Ticket #79 (75)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'red light vayara staff gaidakot janu vako cha' AND created_at = '2026-09-14 12:25:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Customer Complain', 'Medium', 'red light vayara staff gaidakot janu vako cha', 'red light vayara staff gaidakot janu vako cha',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-14 18:00:00'::timestamp, '2026-09-14 12:25:00'::timestamp, COALESCE('2026-09-14 18:00:00'::timestamp, '2026-09-14 12:25:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 12:25:00'::timestamp);
  END IF;

  -- Ticket #80 (76)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = '40 kilo ma main link down' AND created_at = '2026-09-14 16:45:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', '40 kilo ma main link down', '40 kilo ma main link down',
      'CLOSED', 'Action Taken: inform  kawasoti team with madav sir | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-14 18:00:00'::timestamp, '2026-09-14 16:45:00'::timestamp, COALESCE('2026-09-14 18:00:00'::timestamp, '2026-09-14 16:45:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-14 16:45:00'::timestamp);
  END IF;

  -- Ticket #81 (77)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'buspark to line chock samma ko line  hejo beluka bata down' AND created_at = '2026-09-15 10:15:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'buspark to line chock samma ko line  hejo beluka bata down', 'buspark to line chock samma ko line  hejo beluka bata down',
      'CLOSED', 'Action Taken: inform me | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-15 10:15:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-15 10:15:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 10:15:00'::timestamp);
  END IF;

  -- Ticket #82 (78)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike bill book renew garnay time vayo vannu vako cha' AND created_at = '2026-09-15 10:21:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'bike bill book renew garnay time vayo vannu vako cha', 'bike bill book renew garnay time vayo vannu vako cha',
      'CLOSED', 'Action Taken: inform group and me | Remarks: time milayara garnu vandiya ko chu', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-15 10:21:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-15 10:21:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 10:21:00'::timestamp);
  END IF;

  -- Ticket #83 (79)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kiran rai new staff leave ma hunucha personal work' AND created_at = '2026-09-15 10:33:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'kiran rai new staff leave ma hunucha personal work', 'kiran rai new staff leave ma hunucha personal work',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-15 10:33:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-15 10:33:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 10:33:00'::timestamp);
  END IF;

  -- Ticket #84 (80)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'aja pani office aauna let huncha vannu vako cha' AND created_at = '2026-09-15 11:40:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'aja pani office aauna let huncha vannu vako cha', 'aja pani office aauna let huncha vannu vako cha',
      'CLOSED', 'Action Taken: group ma mess garanu vanay garanu vako xaina', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-15 11:40:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-15 11:40:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 11:40:00'::timestamp);
  END IF;

  -- Ticket #85 (81)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'voli bata kawasoti branch ma fiber change ko kam hudai cha vako fiber ...' AND created_at = '2026-09-15 12:44:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'voli bata kawasoti branch ma fiber change ko kam hudai cha vako fiber ...', 'voli bata kawasoti branch ma fiber change ko kam hudai cha vako fiber ma problem aayar',
      'CLOSED', 'Action Taken: call me and voli kam strded vaya paxi group ma inform garanu hunxa | Remarks: change fiber solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-15 12:44:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-15 12:44:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 12:44:00'::timestamp);
  END IF;

  -- Ticket #86 (82)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dudhe to kankai nagarpailka samma fiber 6 k.m old fiber vayara  32/33 ...' AND created_at = '2026-09-15 13:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'dudhe to kankai nagarpailka samma fiber 6 k.m old fiber vayara  32/33 ...', 'dudhe to kankai nagarpailka samma fiber 6 k.m old fiber vayara  32/33 ota tifiln box vayako lay maxixum link problem',
      'IN_PROGRESS', 'Action Taken: forward stock team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-15 13:10:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-15 13:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 13:10:00'::timestamp);
  END IF;

  -- Ticket #87 (83)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dhangadhi Branch') OR LOWER(name) = LOWER('Dhangadhi') OR LOWER(name) LIKE '%dhangadhi%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'chitije sir lay kam xodanu vaya ra salary and hisav ko kura garanu vak...' AND created_at = '2026-09-15 13:17:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'chitije sir lay kam xodanu vaya ra salary and hisav ko kura garanu vak...', 'chitije sir lay kam xodanu vaya ra salary and hisav ko kura garanu vako cha',
      'CLOSED', 'Action Taken: forward finace team | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-00-15 18:00:00'::timestamp, '2026-09-15 13:17:00'::timestamp, COALESCE('2026-00-15 18:00:00'::timestamp, '2026-09-15 13:17:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 13:17:00'::timestamp);
  END IF;

  -- Ticket #88 (84)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sunwal Branch') OR LOWER(name) = LOWER('Sunwal') OR LOWER(name) LIKE '%sunwal%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue' AND created_at = '2026-09-15 14:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'net slow issue', 'net slow issue',
      'CLOSED', 'Action Taken: forward noc team | Remarks: coordination noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-15 18:00:00'::timestamp, '2026-09-15 14:05:00'::timestamp, COALESCE('2026-09-15 18:00:00'::timestamp, '2026-09-15 14:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-15 14:05:00'::timestamp);
  END IF;

  -- Ticket #89 (85)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'family problem  leave hunuhuncha' AND created_at = '2026-09-16 11:25:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'family problem  leave hunuhuncha', 'family problem  leave hunuhuncha',
      'CLOSED', 'Action Taken: mail and mess me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 11:25:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 11:25:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 11:25:00'::timestamp);
  END IF;

  -- Ticket #90 (86)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no issue' AND created_at = '2026-09-16 12:23:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no issue', 'no issue',
      'CLOSED', 'Action Taken: followup normal', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 12:23:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 12:23:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 12:23:00'::timestamp);
  END IF;

  -- Ticket #91 (87)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Thankot Branch') OR LOWER(name) = LOWER('Thankot') OR LOWER(name) LIKE '%thankot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dashai offer kahealay aauxa vannu vako thyo' AND created_at = '2026-09-16 13:39:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'dashai offer kahealay aauxa vannu vako thyo', 'dashai offer kahealay aauxa vannu vako thyo',
      'CLOSED', 'Action Taken: forward finace team | Remarks: ary sabi thik cha no complen', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 13:39:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 13:39:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 13:39:00'::timestamp);
  END IF;

  -- Ticket #92 (88)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'router change ma problem 3/4 month vako coustumer ko router ma problem...' AND created_at = '2026-09-16 13:44:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'router change ma problem 3/4 month vako coustumer ko router ma problem...', 'router change ma problem 3/4 month vako coustumer ko router ma problem aaya k garanay sir vannu vako cha',
      'CLOSED', 'Action Taken: forwadd stock team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 13:44:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 13:44:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 13:44:00'::timestamp);
  END IF;

  -- Ticket #93 (89)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerkha Branch') OR LOWER(name) = LOWER('Kerkha') OR LOWER(name) LIKE '%kerkha%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no issue this time' AND created_at = '2026-09-16 14:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no issue this time', 'no issue this time',
      'CLOSED', 'Action Taken: call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 14:10:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 14:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 14:10:00'::timestamp);
  END IF;

  -- Ticket #94 (90)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Goldhap Branch') OR LOWER(name) = LOWER('Goldhap') OR LOWER(name) LIKE '%goldhap%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'baba birami vayar hospital janu parnay vayako lay leave ma hunuhucha' AND created_at = '2026-09-16 14:34:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'baba birami vayar hospital janu parnay vayako lay leave ma hunuhucha', 'baba birami vayar hospital janu parnay vayako lay leave ma hunuhucha',
      'CLOSED', 'Action Taken: mail and inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-16 18:00:00'::timestamp, '2026-09-16 14:34:00'::timestamp, COALESCE('2026-09-16 18:00:00'::timestamp, '2026-09-16 14:34:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-16 14:34:00'::timestamp);
  END IF;

  -- Ticket #95 (91)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike kp full engin badayko kharcha 13600 aako cha office lay payment n...' AND created_at = '2026-09-17 11:59:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'bike kp full engin badayko kharcha 13600 aako cha office lay payment n...', 'bike kp full engin badayko kharcha 13600 aako cha office lay payment nadiya aba bata aarko bike khojanu vandai hunuhuncha',
      'IN_PROGRESS', 'Action Taken: inform finace team | Remarks: office bata service ko payment dinay garayko xaina raiaxa', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-17 11:59:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-17 11:59:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-17 11:59:00'::timestamp);
  END IF;

  -- Ticket #96 (92)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam aja pani...' AND created_at = '2026-09-17 12:08:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Medium', 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam aja pani...', 'bidut lay new pol halana lagay ko new pol ma fiber sarnay kam aja pani   hudai cha',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-17 18:00:00'::timestamp, '2026-09-17 12:08:00'::timestamp, COALESCE('2026-09-17 18:00:00'::timestamp, '2026-09-17 12:08:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-17 12:08:00'::timestamp);
  END IF;

  -- Ticket #97 (93)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'wifi6 gpone model zr-ac120r connect disconnect problem and no range pr...' AND created_at = '2026-09-17 13:14:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'wifi6 gpone model zr-ac120r connect disconnect problem and no range pr...', 'wifi6 gpone model zr-ac120r connect disconnect problem and no range probllem',
      'CLOSED', 'Action Taken: inform noc team | Remarks: coordination noc team and solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-17 18:00:00'::timestamp, '2026-09-17 13:14:00'::timestamp, COALESCE('2026-09-17 18:00:00'::timestamp, '2026-09-17 13:14:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-17 13:14:00'::timestamp);
  END IF;

  -- Ticket #98 (94)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'chec up ko lagi ktm janu parnay vayako lay bida ma hunuhucha date[4 to...' AND created_at = '2026-09-18 10:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'chec up ko lagi ktm janu parnay vayako lay bida ma hunuhucha date[4 to...', 'chec up ko lagi ktm janu parnay vayako lay bida ma hunuhucha date[4 to 9]',
      'CLOSED', 'Action Taken: inform me and mail', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-18 10:35:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-18 10:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-18 10:35:00'::timestamp);
  END IF;

  -- Ticket #99 (95)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine serviceing ko  time vayara head office pathunu vako cha' AND created_at = '2026-09-18 10:56:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine serviceing ko  time vayara head office pathunu vako cha', 'machine serviceing ko  time vayara head office pathunu vako cha',
      'CLOSED', 'Action Taken: inform stock team | Remarks: received head office', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-18 10:56:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-18 10:56:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-18 10:56:00'::timestamp);
  END IF;

  -- Ticket #100 (96)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damauli Branch') OR LOWER(name) = LOWER('Damauli') OR LOWER(name) LIKE '%damauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'no issue' AND created_at = '2026-09-18 12:55:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Low', 'no issue', 'no issue',
      'CLOSED', 'Action Taken: call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-18 12:55:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-18 12:55:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-18 12:55:00'::timestamp);
  END IF;

  -- Ticket #101 (97)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damak Branch') OR LOWER(name) = LOWER('Damak') OR LOWER(name) LIKE '%damak%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'damak tera ko branch ma yati bela issue xaina vannu vayo sabi normal c...' AND created_at = '2026-09-18 15:52:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'damak tera ko branch ma yati bela issue xaina vannu vayo sabi normal c...', 'damak tera ko branch ma yati bela issue xaina vannu vayo sabi normal cha',
      'CLOSED', 'Action Taken: call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-18 18:00:00'::timestamp, '2026-09-18 15:52:00'::timestamp, COALESCE('2026-09-18 18:00:00'::timestamp, '2026-09-18 15:52:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-18 15:52:00'::timestamp);
  END IF;

  -- Ticket #102 (98)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kanchan Branch') OR LOWER(name) = LOWER('Kanchan') OR LOWER(name) LIKE '%kanchan%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kanchan branch ma new conncetion 7500 ma garana garo hunaxa price ma k...' AND created_at = '2026-09-20 10:23:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Medium', 'kanchan branch ma new conncetion 7500 ma garana garo hunaxa price ma k...', 'kanchan branch ma new conncetion 7500 ma garana garo hunaxa price ma kahi kam vaya websurfer ko  coustumer sifting garana sajilo hunthyo demand',
      'CLOSED', 'Action Taken: inform finance team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 10:23:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 10:23:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 10:23:00'::timestamp);
  END IF;

  -- Ticket #103 (99)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'staff haru fiber tanna lagay ko lay complan herana ko lagi pithauli ba...' AND created_at = '2026-09-20 10:55:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'staff haru fiber tanna lagay ko lay complan herana ko lagi pithauli ba...', 'staff haru fiber tanna lagay ko lay complan herana ko lagi pithauli bata narayan bastola janu vako cha',
      'CLOSED', 'Action Taken: inform me call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 10:55:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 10:55:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 10:55:00'::timestamp);
  END IF;

  -- Ticket #104 (100)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Thankot Branch') OR LOWER(name) = LOWER('Thankot') OR LOWER(name) LIKE '%thankot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'dashai offer kahealay aauxa vannu vako cha' AND created_at = '2026-09-20 11:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Low', 'dashai offer kahealay aauxa vannu vako cha', 'dashai offer kahealay aauxa vannu vako cha',
      'CLOSED', 'Action Taken: inform me call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 11:00:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 11:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 11:00:00'::timestamp);
  END IF;

  -- Ticket #105 (101)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bailbas Branch') OR LOWER(name) = LOWER('Bailbas') OR LOWER(name) LIKE '%bailbas%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue' AND created_at = '2026-09-20 11:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net slow issue', 'net slow issue',
      'CLOSED', 'Action Taken: inform noc team | Remarks: noc team saga call ma bujada 2/4 din aagi ko issue ho sir vannu vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 11:10:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 11:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 11:10:00'::timestamp);
  END IF;

  -- Ticket #106 (102)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Goldhap Branch') OR LOWER(name) = LOWER('Goldhap') OR LOWER(name) LIKE '%goldhap%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'desktop ko display gayara kam pending' AND created_at = '2026-09-20 11:54:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'desktop ko display gayara kam pending', 'desktop ko display gayara kam pending',
      'CLOSED', 'Action Taken: inform stock team | Remarks: banauna ko lagi pathana lako', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-23 18:00:00'::timestamp, '2026-09-20 11:54:00'::timestamp, COALESCE('2026-09-23 18:00:00'::timestamp, '2026-09-20 11:54:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 11:54:00'::timestamp);
  END IF;

  -- Ticket #107 (103)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'need staff [new staff ghar janu vako aja samma aaunu navaya ko lay aba...' AND created_at = '2026-09-20 12:50:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'need staff [new staff ghar janu vako aja samma aaunu navaya ko lay aba...', 'need staff [new staff ghar janu vako aja samma aaunu navaya ko lay aba aaunu hunna ray  ]',
      'CLOSED', 'Action Taken: inform hr', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 12:50:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 12:50:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 12:50:00'::timestamp);
  END IF;

  -- Ticket #108 (104)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pharsatikar Branch') OR LOWER(name) = LOWER('Pharsatikar') OR LOWER(name) LIKE '%pharsatikar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net solw issue dherai aako cha' AND created_at = '2026-09-20 16:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'net solw issue dherai aako cha', 'net solw issue dherai aako cha',
      'CLOSED', 'Action Taken: inform noc team | Remarks: damak sandeep sir pani bujunu vanay ko chu', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 16:05:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 16:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 16:05:00'::timestamp);
  END IF;

  -- Ticket #109 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Operation HQ') OR LOWER(name) = LOWER('Operation HQ') OR LOWER(name) LIKE '%operation hq%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch' AND created_at = '2026-09-20 17:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'High', 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch', 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-20 18:00:00'::timestamp, '2026-09-20 17:05:00'::timestamp, COALESCE('2026-09-20 18:00:00'::timestamp, '2026-09-20 17:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-20 17:05:00'::timestamp);
  END IF;

  -- Ticket #110 (105)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'offfice ma vayako ups ma problem aayako lay new ups need' AND created_at = '2026-09-21 10:28:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'offfice ma vayako ups ma problem aayako lay new ups need', 'offfice ma vayako ups ma problem aayako lay new ups need',
      'CLOSED', 'Action Taken: inform stock team and ashok sir | Remarks: cheking ashok sir', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-24 18:00:00'::timestamp, '2026-09-21 10:28:00'::timestamp, COALESCE('2026-09-24 18:00:00'::timestamp, '2026-09-21 10:28:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-21 10:28:00'::timestamp);
  END IF;

  -- Ticket #111 (106)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Sundar-Bazzar Branch') OR LOWER(name) = LOWER('Sundar-Bazzar') OR LOWER(name) LIKE '%sundar-bazzar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net stable xaina vannay complean aako cha' AND created_at = '2026-09-21 10:42:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'net stable xaina vannay complean aako cha', 'net stable xaina vannay complean aako cha',
      'CLOSED', 'Action Taken: inform noc team | Remarks: corradition noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-21 18:00:00'::timestamp, '2026-09-21 10:42:00'::timestamp, COALESCE('2026-09-21 18:00:00'::timestamp, '2026-09-21 10:42:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-21 10:42:00'::timestamp);
  END IF;

  -- Ticket #112 (107)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'chori lai check garna hospital lanu paray ko lay suray rimal bida ma h...' AND created_at = '2026-09-22 10:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'chori lai check garna hospital lanu paray ko lay suray rimal bida ma h...', 'chori lai check garna hospital lanu paray ko lay suray rimal bida ma hunuhuncha',
      'CLOSED', 'Action Taken: inform me  and call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-22 18:00:00'::timestamp, '2026-09-22 10:35:00'::timestamp, COALESCE('2026-09-22 18:00:00'::timestamp, '2026-09-22 10:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-22 10:35:00'::timestamp);
  END IF;

  -- Ticket #113 (108)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'katari ko staff ghar bata katari branch farkanu vaya ko lay bijay chau...' AND created_at = '2026-09-22 10:50:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'katari ko staff ghar bata katari branch farkanu vaya ko lay bijay chau...', 'katari ko staff ghar bata katari branch farkanu vaya ko lay bijay chaudari dai aja narayaghat farakadai hunuhucha',
      'CLOSED', 'Action Taken: inform me  and call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-22 18:00:00'::timestamp, '2026-09-22 10:50:00'::timestamp, COALESCE('2026-09-22 18:00:00'::timestamp, '2026-09-22 10:50:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-22 10:50:00'::timestamp);
  END IF;

  -- Ticket #114 (109)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Belbari Branch') OR LOWER(name) = LOWER('Belbari') OR LOWER(name) LIKE '%belbari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'fan bigray  ko lay new fan need' AND created_at = '2026-09-22 11:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Medium', 'fan bigray  ko lay new fan need', 'fan bigray  ko lay new fan need',
      'CLOSED', 'Action Taken: inform me  and group mess', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-22 18:00:00'::timestamp, '2026-09-22 11:10:00'::timestamp, COALESCE('2026-09-22 18:00:00'::timestamp, '2026-09-22 11:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-22 11:10:00'::timestamp);
  END IF;

  -- Ticket #115 (110)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bhutaha/Bardaghat Branch') OR LOWER(name) = LOWER('Bhutaha/Bardaghat') OR LOWER(name) LIKE '%bhutaha/bardaghat%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bardaghat and sunwal net slow isuue [7pm to 9pm]ma maximum net slow is...' AND created_at = '2026-09-22 11:24:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'bardaghat and sunwal net slow isuue [7pm to 9pm]ma maximum net slow is...', 'bardaghat and sunwal net slow isuue [7pm to 9pm]ma maximum net slow issue',
      'CLOSED', 'Action Taken: inform noc team | Remarks: corridation noc team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-22 18:00:00'::timestamp, '2026-09-22 11:24:00'::timestamp, COALESCE('2026-09-22 18:00:00'::timestamp, '2026-09-22 11:24:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-22 11:24:00'::timestamp);
  END IF;

  -- Ticket #116 (111)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gokarna Branch') OR LOWER(name) = LOWER('Gokarna') OR LOWER(name) LIKE '%gokarna%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine ma problrm vayara repair ko lagi dinu vako cha' AND created_at = '2026-09-23 10:07:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'machine ma problrm vayara repair ko lagi dinu vako cha', 'machine ma problrm vayara repair ko lagi dinu vako cha',
      'CLOSED', 'Action Taken: inform me and group mess', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-23 10:07:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-23 10:07:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-23 10:07:00'::timestamp);
  END IF;

  -- Ticket #117 (112)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'ithari ma vako 9168 number ko gadi fiberworld ko name ma namsari vayo' AND created_at = '2026-09-23 15:30:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'ithari ma vako 9168 number ko gadi fiberworld ko name ma namsari vayo', 'ithari ma vako 9168 number ko gadi fiberworld ko name ma namsari vayo',
      'CLOSED', 'Action Taken: inform me and group mess | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-23 18:00:00'::timestamp, '2026-09-23 15:30:00'::timestamp, COALESCE('2026-09-23 18:00:00'::timestamp, '2026-09-23 15:30:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-23 15:30:00'::timestamp);
  END IF;

  -- Ticket #118 (113)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net 2/4 dina vayo issue problem tiktok messenger ma maxixum slow' AND created_at = '2026-09-24 10:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'High', 'net 2/4 dina vayo issue problem tiktok messenger ma maxixum slow', 'net 2/4 dina vayo issue problem tiktok messenger ma maxixum slow',
      'CLOSED', 'Action Taken: inform noc team | Remarks: noc team saga bujada issue xaina vannu vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-24 18:00:00'::timestamp, '2026-09-24 10:20:00'::timestamp, COALESCE('2026-09-24 18:00:00'::timestamp, '2026-09-24 10:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-24 10:20:00'::timestamp);
  END IF;

  -- Ticket #119 (114)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bulingtar Branch') OR LOWER(name) = LOWER('Bulingtar') OR LOWER(name) LIKE '%bulingtar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bulingtar branch office ma back up ko lagi 1ta ups ra bettry aja halan...' AND created_at = '2026-09-24 12:42:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'bulingtar branch office ma back up ko lagi 1ta ups ra bettry aja halan...', 'bulingtar branch office ma back up ko lagi 1ta ups ra bettry aja halanu vayo',
      'CLOSED', 'Action Taken: inform me and group mess | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-24 18:00:00'::timestamp, '2026-09-24 12:42:00'::timestamp, COALESCE('2026-09-24 18:00:00'::timestamp, '2026-09-24 12:42:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-24 12:42:00'::timestamp);
  END IF;

  -- Ticket #120 (115)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kanchan Branch') OR LOWER(name) = LOWER('Kanchan') OR LOWER(name) LIKE '%kanchan%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'router navayara connection loss vako cha need router' AND created_at = '2026-09-25 11:06:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Urgent', 'router navayara connection loss vako cha need router', 'router navayara connection loss vako cha need router',
      'CLOSED', 'Action Taken: inform stock team | Remarks: stock dep ma bujda no stock router 2.4g', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-09-25 11:06:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-09-25 11:06:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-25 11:06:00'::timestamp);
  END IF;

  -- Ticket #121 (116)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerabari Branch') OR LOWER(name) = LOWER('Kerabari') OR LOWER(name) LIKE '%kerabari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'router navayara connection hold need router' AND created_at = '2026-09-25 11:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Urgent', 'router navayara connection hold need router', 'router navayara connection hold need router',
      'CLOSED', 'Action Taken: inform stock team | Remarks: stock dep ma bujda no stock router 2.4g', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-09-25 11:10:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-09-25 11:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-25 11:10:00'::timestamp);
  END IF;

  -- Ticket #122 (117)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'katari bata farkay paxi health ma problem vayara rest ma hunuhuncha su...' AND created_at = '2026-09-25 11:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Medium', 'katari bata farkay paxi health ma problem vayara rest ma hunuhuncha su...', 'katari bata farkay paxi health ma problem vayara rest ma hunuhuncha sunday bata join hunuhuncha office',
      'CLOSED', 'Action Taken: inform hr | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-25 11:20:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-25 11:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-25 11:20:00'::timestamp);
  END IF;

  -- Ticket #123 (118)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Jitpur Branch') OR LOWER(name) = LOWER('Jitpur') OR LOWER(name) LIKE '%jitpur%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bike ko tyre old vayako lay change garanu parnay' AND created_at = '2026-09-25 12:49:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'bike ko tyre old vayako lay change garanu parnay', 'bike ko tyre old vayako lay change garanu parnay',
      'CLOSED', 'Action Taken: inform finance team | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-25 18:00:00'::timestamp, '2026-09-25 12:49:00'::timestamp, COALESCE('2026-09-25 18:00:00'::timestamp, '2026-09-25 12:49:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-25 12:49:00'::timestamp);
  END IF;

  -- Ticket #124 (119)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'pokhara brncha ko chinedada olt ma earthing halnay kam complete vayo' AND created_at = '2026-09-25 13:21:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'pokhara brncha ko chinedada olt ma earthing halnay kam complete vayo', 'pokhara brncha ko chinedada olt ma earthing halnay kam complete vayo',
      'CLOSED', 'Action Taken: imform all | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-25 18:00:00'::timestamp, '2026-09-25 13:21:00'::timestamp, COALESCE('2026-09-25 18:00:00'::timestamp, '2026-09-25 13:21:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-25 13:21:00'::timestamp);
  END IF;

  -- Ticket #125 (120)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'pathuri chowk bata balgadan chock samma fiber kateko vayara 30 to 35 j...' AND created_at = '2026-09-27 11:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'pathuri chowk bata balgadan chock samma fiber kateko vayara 30 to 35 j...', 'pathuri chowk bata balgadan chock samma fiber kateko vayara 30 to 35 jana offline vayako 500m fiber emengency need',
      'CLOSED', 'Action Taken: inform stock dep | Remarks: purchased by manakaman ithari', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-27 11:20:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-27 11:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-27 11:20:00'::timestamp);
  END IF;

  -- Ticket #126 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Operation HQ') OR LOWER(name) = LOWER('Operation HQ') OR LOWER(name) LIKE '%operation hq%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'visit new branch amrasa branch' AND created_at = '2026-09-27 14:39:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'visit new branch amrasa branch', 'visit new branch amrasa branch',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-27 14:39:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-27 14:39:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-27 14:39:00'::timestamp);
  END IF;

  -- Ticket #127 (121)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'bijay chaudari dai ko realative death vaya ko sagar gayara office aaud...' AND created_at = '2026-09-28 10:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'bijay chaudari dai ko realative death vaya ko sagar gayara office aaud...', 'bijay chaudari dai ko realative death vaya ko sagar gayara office aauda dhala hunaxa vannu vako cha',
      'CLOSED', 'Action Taken: imform me | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-28 10:05:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-28 10:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-28 10:05:00'::timestamp);
  END IF;

  -- Ticket #128 (122)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Katari Branch') OR LOWER(name) = LOWER('Katari') OR LOWER(name) LIKE '%katari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'rati bata line gayako lay back up down vaya ko lay jenerator vada ma l...' AND created_at = '2026-09-28 10:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'rati bata line gayako lay back up down vaya ko lay jenerator vada ma l...', 'rati bata line gayako lay back up down vaya ko lay jenerator vada ma linu paraxa vannu vako cha',
      'CLOSED', 'Action Taken: inform group and call me | Remarks: kahi time wait garay paxi 1/2 hourma line aayo no usge jenerator', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-28 10:00:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-28 10:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-28 10:00:00'::timestamp);
  END IF;

  -- Ticket #129 (123)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'wifi 6 gpone model zr-ac120 r ma net solw issue and time time afai aau...' AND created_at = '2026-09-28 10:39:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'wifi 6 gpone model zr-ac120 r ma net solw issue and time time afai aau...', 'wifi 6 gpone model zr-ac120 r ma net solw issue and time time afai aaunay janay hunay problem',
      'CLOSED', 'Action Taken: inform noc dep | Remarks: new wifi 6replace ko lagi pathjunu vako cha stock team bata', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-28 10:39:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-28 10:39:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-28 10:39:00'::timestamp);
  END IF;

  -- Ticket #130 (124)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'national id card banauna janu parnay vaya ko lay 1.30 hour ko lagi kaw...' AND created_at = '2026-09-28 10:50:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'national id card banauna janu parnay vaya ko lay 1.30 hour ko lagi kaw...', 'national id card banauna janu parnay vaya ko lay 1.30 hour ko lagi kawasoti janu vako cha',
      'CLOSED', 'Action Taken: inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-27 18:00:00'::timestamp, '2026-09-28 10:50:00'::timestamp, COALESCE('2026-09-27 18:00:00'::timestamp, '2026-09-28 10:50:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-28 10:50:00'::timestamp);
  END IF;

  -- Ticket #131 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Operation HQ') OR LOWER(name) = LOWER('Operation HQ') OR LOWER(name) LIKE '%operation hq%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch' AND created_at = '2026-09-29 10:56:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch', 'sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch',
      'CLOSED', 'Action Taken: inform me call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-29 10:56:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-29 10:56:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 10:56:00'::timestamp);
  END IF;

  -- Ticket #132 (125)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'morning time 7to 8 and night 8 to 9 pm ma net slow issue complean' AND created_at = '2026-09-29 11:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'morning time 7to 8 and night 8 to 9 pm ma net slow issue complean', 'morning time 7to 8 and night 8 to 9 pm ma net slow issue complean',
      'OPEN', 'Action Taken: inform noc team', CASE WHEN 'OPEN' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-29 11:00:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-29 11:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 11:00:00'::timestamp);
  END IF;

  -- Ticket #133 ()
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kanchan Branch') OR LOWER(name) = LOWER('Kanchan') OR LOWER(name) LIKE '%kanchan%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'hamero kanchan bardaghat pharsatikar kawasoti bill book navaya ko bike...' AND created_at = '2026-09-29 11:03:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'hamero kanchan bardaghat pharsatikar kawasoti bill book navaya ko bike...', 'hamero kanchan bardaghat pharsatikar kawasoti bill book navaya ko bike  and scoketi filed ma ushe vako cha ashok sir rajesh sir',
      'IN_PROGRESS', NULL, CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-29 11:03:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-29 11:03:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 11:03:00'::timestamp);
  END IF;

  -- Ticket #134 (126)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Itahari Branch') OR LOWER(name) = LOWER('Itahari') OR LOWER(name) LIKE '%itahari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'machine ma problem aaya ko k problem ho dekhaun launu vako cha  d-teac...' AND created_at = '2026-09-29 11:18:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'machine ma problem aaya ko k problem ho dekhaun launu vako cha  d-teac...', 'machine ma problem aaya ko k problem ho dekhaun launu vako cha  d-teach ma',
      'CLOSED', 'Action Taken: inform stock team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-29 11:18:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-29 11:18:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 11:18:00'::timestamp);
  END IF;

  -- Ticket #135 (127)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pathari Branch (All)') OR LOWER(name) = LOWER('Pathari') OR LOWER(name) LIKE '%pathari%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'ups ma problem' AND created_at = '2026-09-29 11:41:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'ups ma problem', 'ups ma problem',
      'CLOSED', 'Action Taken: inform stock team  and ashok sir | Remarks: loose conection ko issue ho banaunu paraxa vannu vayo ashok sir lay thie inform gariya ko chu pathari umesh sir lai', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-29 11:41:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-29 11:41:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 11:41:00'::timestamp);
  END IF;

  -- Ticket #136 (128)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bulingtar Branch') OR LOWER(name) = LOWER('Bulingtar') OR LOWER(name) LIKE '%bulingtar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'familay problem vayara aja bida ma hunuhuncha' AND created_at = '2026-09-29 11:56:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'familay problem vayara aja bida ma hunuhuncha', 'familay problem vayara aja bida ma hunuhuncha',
      'CLOSED', 'Action Taken: inform me | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-29 11:56:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-29 11:56:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 11:56:00'::timestamp);
  END IF;

  -- Ticket #137 (129)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'new connection ko lagi fiber tannu parayko lay narayghat ko staff gaid...' AND created_at = '2026-09-29 00:02:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Sales', 'Medium', 'new connection ko lagi fiber tannu parayko lay narayghat ko staff gaid...', 'new connection ko lagi fiber tannu parayko lay narayghat ko staff gaidakot janu vako cha',
      'CLOSED', 'Action Taken: inform me | Remarks: solve', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-09-29 18:00:00'::timestamp, '2026-09-29 00:02:00'::timestamp, COALESCE('2026-09-29 18:00:00'::timestamp, '2026-09-29 00:02:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-29 00:02:00'::timestamp);
  END IF;

  -- Ticket #138 (130)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Bulingtar Branch') OR LOWER(name) = LOWER('Bulingtar') OR LOWER(name) LIKE '%bulingtar%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'palpa ma vayako battery ma problem aayar net ma problem so need bettry' AND created_at = '2026-09-30 10:13:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'palpa ma vayako battery ma problem aayar net ma problem so need bettry', 'palpa ma vayako battery ma problem aayar net ma problem so need bettry',
      'IN_PROGRESS', 'Action Taken: inform stock team', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-09-30 10:13:00'::timestamp, COALESCE(NULL::timestamp, '2026-09-30 10:13:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-30 10:13:00'::timestamp);
  END IF;

  -- Ticket #139 (131)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kerkha Branch') OR LOWER(name) = LOWER('Kerkha') OR LOWER(name) LIKE '%kerkha%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'kerka branch ma 800 m fiber tanayo vany 7/8 ota new connection aauxa v...' AND created_at = '2026-09-30 13:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'kerka branch ma 800 m fiber tanayo vany 7/8 ota new connection aauxa v...', 'kerka branch ma 800 m fiber tanayo vany 7/8 ota new connection aauxa vannu vako cha',
      'CLOSED', 'Action Taken: infoerm stock team | Remarks: sandeep sir lay call garanu vako thyo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-09-30 13:00:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-09-30 13:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-09-30 13:00:00'::timestamp);
  END IF;

  -- Ticket #140 (132)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'office ma vayako bettry ma problem aayara check garadai hunuhucha' AND created_at = '2026-10-01 10:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'office ma vayako bettry ma problem aayara check garadai hunuhucha', 'office ma vayako bettry ma problem aayara check garadai hunuhucha',
      'CLOSED', 'Action Taken: inform group and call me | Remarks: berrty safa garay paxi problem solve vayo', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-10-01 10:20:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-10-01 10:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-01 10:20:00'::timestamp);
  END IF;

  -- Ticket #141 (133)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Dudhe Branch') OR LOWER(name) = LOWER('Dudhe') OR LOWER(name) LIKE '%dudhe%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'net slow issue problem' AND created_at = '2026-10-01 10:35:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Urgent', 'net slow issue problem', 'net slow issue problem',
      'CLOSED', 'Action Taken: infoerm noc team | Remarks: noc team lay check gardai hunuhuncha', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-10-01 10:35:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-10-01 10:35:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-01 10:35:00'::timestamp);
  END IF;

  -- Ticket #142 (134)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Kawasoti Branch') OR LOWER(name) = LOWER('Kawasoti') OR LOWER(name) LIKE '%kawasoti%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'lamjung chock,sagaramatra tool and 5kattha ma bidhut lay pol sareranay...' AND created_at = '2026-10-01 11:38:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'High', 'lamjung chock,sagaramatra tool and 5kattha ma bidhut lay pol sareranay...', 'lamjung chock,sagaramatra tool and 5kattha ma bidhut lay pol sareranay ko fiber cut vayako lay morning bata kam vako cha',
      'CLOSED', 'Action Taken: inform me and call', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-10-01 11:38:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-10-01 11:38:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-01 11:38:00'::timestamp);
  END IF;

  -- Ticket #143 (135)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Narayangarh Branch') OR LOWER(name) = LOWER('Narayangarh') OR LOWER(name) LIKE '%narayangarh%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'db box open  garana janu vako cha' AND created_at = '2026-10-01 14:20:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Others', 'Medium', 'db box open  garana janu vako cha', 'db box open  garana janu vako cha',
      'CLOSED', NULL, CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-10-01 14:20:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-10-01 14:20:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-01 14:20:00'::timestamp);
  END IF;

  -- Ticket #144 (136)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Damauli Branch') OR LOWER(name) = LOWER('Damauli') OR LOWER(name) LIKE '%damauli%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'damauli vako ladder vachiya kola lay narayghat branch vako ladder path...' AND created_at = '2026-10-01 17:30:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'damauli vako ladder vachiya kola lay narayghat branch vako ladder path...', 'damauli vako ladder vachiya kola lay narayghat branch vako ladder pathako chu',
      'CLOSED', 'Action Taken: inform stock team | Remarks: narayanght ko ladder pathaya ko', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-01 18:00:00'::timestamp, '2026-10-01 17:30:00'::timestamp, COALESCE('2026-10-01 18:00:00'::timestamp, '2026-10-01 17:30:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-01 17:30:00'::timestamp);
  END IF;

  -- Ticket #145 (137)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'familay problem vayara leave ma hunucha and ngt ko saff gaidakot janu ...' AND created_at = '2026-10-02 10:05:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'familay problem vayara leave ma hunucha and ngt ko saff gaidakot janu ...', 'familay problem vayara leave ma hunucha and ngt ko saff gaidakot janu vako cha',
      'CLOSED', 'Action Taken: mail and inform me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-02 18:00:00'::timestamp, '2026-10-02 10:05:00'::timestamp, COALESCE('2026-10-02 18:00:00'::timestamp, '2026-10-02 10:05:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-02 10:05:00'::timestamp);
  END IF;

  -- Ticket #146 (138)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'chauthe radakrishna madiir to belchautra side ma pol shitfing ko kam n...' AND created_at = '2026-10-02 10:22:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Technical / Network Issue', 'Medium', 'chauthe radakrishna madiir to belchautra side ma pol shitfing ko kam n...', 'chauthe radakrishna madiir to belchautra side ma pol shitfing ko kam nasaikay ko lay morning bata kam hudai cha',
      'IN_PROGRESS', 'Action Taken: group mess and call me', CASE WHEN 'IN_PROGRESS' = 'CLOSED' THEN v_user_id ELSE NULL END, NULL::timestamp, '2026-10-02 10:22:00'::timestamp, COALESCE(NULL::timestamp, '2026-10-02 10:22:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-02 10:22:00'::timestamp);
  END IF;

  -- Ticket #147 (139)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'fiber clever bigaray ko lay need' AND created_at = '2026-10-02 17:00:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'Hardware and Equipment', 'Urgent', 'fiber clever bigaray ko lay need', 'fiber clever bigaray ko lay need',
      'CLOSED', 'Action Taken: inform stock team', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-02 18:00:00'::timestamp, '2026-10-02 17:00:00'::timestamp, COALESCE('2026-10-02 18:00:00'::timestamp, '2026-10-02 17:00:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-02 17:00:00'::timestamp);
  END IF;

  -- Ticket #148 (140)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Budhabare Branch') OR LOWER(name) = LOWER('Budhabare') OR LOWER(name) LIKE '%budhabare%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'ghar na sarad vaaya ko office 2bajay samma aaiepugxu vannu vako cha' AND created_at = '2026-10-04 10:10:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'ghar na sarad vaaya ko office 2bajay samma aaiepugxu vannu vako cha', 'ghar na sarad vaaya ko office 2bajay samma aaiepugxu vannu vako cha',
      'CLOSED', 'Action Taken: inform call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-04 18:00:00'::timestamp, '2026-10-04 10:10:00'::timestamp, COALESCE('2026-10-04 18:00:00'::timestamp, '2026-10-04 10:10:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-04 10:10:00'::timestamp);
  END IF;

  -- Ticket #149 (141)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Gaidakot Branch') OR LOWER(name) = LOWER('Gaidakot') OR LOWER(name) LIKE '%gaidakot%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'birami vayara follow up ko lagi hospital janu parnay vayako lay abhira...' AND created_at = '2026-10-04 10:22:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'birami vayara follow up ko lagi hospital janu parnay vayako lay abhira...', 'birami vayara follow up ko lagi hospital janu parnay vayako lay abhiral kumal aaunu vako xaina',
      'CLOSED', 'Action Taken: inform call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-04 18:00:00'::timestamp, '2026-10-04 10:22:00'::timestamp, COALESCE('2026-10-04 18:00:00'::timestamp, '2026-10-04 10:22:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-04 10:22:00'::timestamp);
  END IF;

  -- Ticket #150 (142)
  SELECT id INTO v_branch_id FROM branches WHERE LOWER(name) = LOWER('Pokhara Branch') OR LOWER(name) = LOWER('Pokhara') OR LOWER(name) LIKE '%pokhara%' LIMIT 1;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = 'Operation HQ' LIMIT 1;
  END IF;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches ORDER BY id ASC LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM operation_tickets WHERE branch_id = v_branch_id AND subject = 'hejo office ma kam vayako lay aaunu vako thyo aja bida ma hunuhucha' AND created_at = '2026-10-04 10:40:00'::timestamp) THEN
    INSERT INTO operation_tickets (
      branch_id, created_by, category, priority, subject, description,
      status, resolution, closed_by, closed_at, created_at, updated_at
    ) VALUES (
      v_branch_id, v_user_id, 'HR / ADMIN', 'Low', 'hejo office ma kam vayako lay aaunu vako thyo aja bida ma hunuhucha', 'hejo office ma kam vayako lay aaunu vako thyo aja bida ma hunuhucha',
      'CLOSED', 'Action Taken: inform call me', CASE WHEN 'CLOSED' = 'CLOSED' THEN v_user_id ELSE NULL END, '2026-10-04 18:00:00'::timestamp, '2026-10-04 10:40:00'::timestamp, COALESCE('2026-10-04 18:00:00'::timestamp, '2026-10-04 10:40:00'::timestamp)
    ) RETURNING id INTO v_ticket_id;

    INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
    VALUES (v_ticket_id, v_user_id, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', '2026-10-04 10:40:00'::timestamp);
  END IF;

END 45778;