-- 1. save_line_group(p_group_id text)
-- → UPSERT line_groups, set this group is_active=true, all others is_active=false
CREATE OR REPLACE FUNCTION handover_sys.save_line_group(p_group_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
BEGIN
    -- Set all other groups is_active to false
    UPDATE handover_sys.line_groups 
    SET is_active = false 
    WHERE group_id != p_group_id;

    -- Upsert the selected group to is_active = true
    INSERT INTO handover_sys.line_groups (group_id, is_active, joined_at)
    VALUES (p_group_id, true, now())
    ON CONFLICT (group_id) 
    DO UPDATE SET is_active = true, joined_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.save_line_group(text) TO anon, authenticated;


-- 2. get_active_line_group()
-- → returns text: group_id where is_active=true LIMIT 1
CREATE OR REPLACE FUNCTION handover_sys.get_active_line_group()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
DECLARE
    v_group_id text;
BEGIN
    SELECT group_id INTO v_group_id
    FROM handover_sys.line_groups
    WHERE is_active = true
    ORDER BY joined_at DESC
    LIMIT 1;
    
    RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.get_active_line_group() TO anon, authenticated;


-- 3. accept_handover_from_line(p_handover_id uuid, p_line_display_name text, p_line_user_id text)
-- → UPDATE handovers SET status='Accepted', receiver_line_name, receiver_id
CREATE OR REPLACE FUNCTION handover_sys.accept_handover_from_line(
    p_handover_id uuid, 
    p_line_display_name text, 
    p_line_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
DECLARE
    v_tasks jsonb;
    v_updated_tasks jsonb := '[]'::jsonb;
    v_task jsonb;
    v_receiver_id uuid := null;
BEGIN
    -- Match registered user if name exists
    SELECT id INTO v_receiver_id
    FROM handover_sys.users
    WHERE full_name = p_line_display_name
    LIMIT 1;

    -- Get current tasks
    SELECT tasks INTO v_tasks
    FROM handover_sys.handovers
    WHERE id = p_handover_id;

    -- Update each task's status to 'Accepted'
    IF v_tasks IS NOT NULL AND jsonb_typeof(v_tasks) = 'array' THEN
        FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks) LOOP
            v_task := jsonb_set(v_task, '{status}', '"Accepted"'::jsonb);
            v_task := jsonb_set(v_task, '{accepted_by_name}', to_jsonb(p_line_display_name));
            v_updated_tasks := v_updated_tasks || v_task;
        END LOOP;
    ELSE
        v_updated_tasks := v_tasks;
    END IF;

    UPDATE handover_sys.handovers
    SET status = 'Accepted',
        receiver_id = v_receiver_id,
        receiver_line_name = p_line_display_name,
        tasks = v_updated_tasks,
        accepted_at = now()
    WHERE id = p_handover_id;
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.accept_handover_from_line(uuid, text, text) TO anon, authenticated;


-- 4. get_task_number(p_handover_id uuid)
-- → returns int: jsonb_array_length(tasks)
CREATE OR REPLACE FUNCTION handover_sys.get_task_number(p_handover_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
DECLARE
    v_length int;
BEGIN
    SELECT jsonb_array_length(tasks) INTO v_length
    FROM handover_sys.handovers
    WHERE id = p_handover_id;
    
    RETURN COALESCE(v_length, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.get_task_number(uuid) TO anon, authenticated;


-- 5. accept_one_task(p_handover_id uuid, p_task_index int, p_line_display_name text, p_line_user_id text)
-- → UPDATE tasks[p_task_index].status = 'Accepted'
-- → IF all tasks Accepted → UPDATE handover.status = 'Accepted'
-- → returns json: { all_done: boolean, remaining: int, task_title: text }
CREATE OR REPLACE FUNCTION handover_sys.accept_one_task(
    p_handover_id uuid, 
    p_task_index int, 
    p_line_display_name text, 
    p_line_user_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
DECLARE
    v_tasks jsonb;
    v_task_title text;
    v_remaining_count int := 0;
    v_total_count int := 0;
    v_item jsonb;
    v_all_done boolean := false;
    v_receiver_id uuid := null;
BEGIN
    -- Match registered user if name exists
    SELECT id INTO v_receiver_id
    FROM handover_sys.users
    WHERE full_name = p_line_display_name
    LIMIT 1;

    -- 1. Get current tasks
    SELECT tasks INTO v_tasks
    FROM handover_sys.handovers
    WHERE id = p_handover_id;

    IF v_tasks IS NULL OR jsonb_typeof(v_tasks) != 'array' THEN
        RETURN json_build_object('all_done', false, 'remaining', 0, 'task_title', 'Unknown task');
    END IF;

    v_total_count := jsonb_array_length(v_tasks);

    -- Ensure index is within range
    IF p_task_index < 0 OR p_task_index >= v_total_count THEN
        RETURN json_build_object('all_done', false, 'remaining', 0, 'task_title', 'Index out of bounds');
    END IF;

    -- Extract task title
    v_task_title := v_tasks->p_task_index->>'title';

    -- Update the specific task status
    v_tasks := jsonb_set(v_tasks, array[p_task_index::text, 'status'], '"Accepted"'::jsonb);
    v_tasks := jsonb_set(v_tasks, array[p_task_index::text, 'accepted_by_name'], to_jsonb(p_line_display_name));

    -- Count remaining pending tasks (ignoring case for comparison)
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_tasks) LOOP
        IF UPPER(COALESCE(v_item->>'status', '')) = 'PENDING' THEN
            v_remaining_count := v_remaining_count + 1;
        END IF;
    END LOOP;

    -- If no pending tasks remain, set handover status to Accepted
    IF v_remaining_count = 0 THEN
        v_all_done := true;
        UPDATE handover_sys.handovers
        SET status = 'Accepted',
            receiver_id = v_receiver_id,
            receiver_line_name = p_line_display_name,
            tasks = v_tasks,
            accepted_at = now()
        WHERE id = p_handover_id;
    ELSE
        UPDATE handover_sys.handovers
        SET tasks = v_tasks
    WHERE id = p_handover_id;
    END IF;

    RETURN json_build_object(
        'all_done', v_all_done,
        'remaining', v_remaining_count,
        'task_title', v_task_title
    );
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.accept_one_task(uuid, int, text, text) TO anon, authenticated;


-- 6. accept_handover_from_liff(p_handover_id uuid, p_receiver_id uuid, p_receiver_line_name text)
-- → Securely update handover from the client LIFF application, bypassing direct table write RLS boundaries
CREATE OR REPLACE FUNCTION handover_sys.accept_handover_from_liff(
    p_handover_id uuid,
    p_receiver_id uuid,
    p_receiver_line_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = handover_sys
AS $$
BEGIN
    UPDATE handover_sys.handovers
    SET status = 'Accepted',
        receiver_id = p_receiver_id,
        receiver_line_name = p_receiver_line_name,
        accepted_at = now()
    WHERE id = p_handover_id;
END;
$$;

GRANT EXECUTE ON FUNCTION handover_sys.accept_handover_from_liff(uuid, uuid, text) TO anon, authenticated;
