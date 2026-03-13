-- Create immutable function for timestamptz to date conversion
CREATE OR REPLACE FUNCTION public.to_date_immutable(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$ SELECT ts::date $$;

-- Delete duplicate recurring task instances, keeping the earliest created_at
DELETE FROM tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY recurrence_parent_id, to_date_immutable(start_date)
        ORDER BY created_at ASC
      ) AS rn
    FROM tasks
    WHERE recurrence_parent_id IS NOT NULL
  ) numbered
  WHERE rn > 1
);

-- Create unique partial index to prevent future duplicates
CREATE UNIQUE INDEX unique_recurring_instance
ON tasks (recurrence_parent_id, to_date_immutable(start_date))
WHERE recurrence_parent_id IS NOT NULL;