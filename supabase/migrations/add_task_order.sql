-- Add order column to tasks table
ALTER TABLE tasks ADD COLUMN "order" INTEGER;

-- Set initial order based on created_at (oldest = 0, newest = highest)
WITH ordered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) - 1 AS row_num
  FROM tasks
)
UPDATE tasks
SET "order" = ordered_tasks.row_num
FROM ordered_tasks
WHERE tasks.id = ordered_tasks.id;

-- Make order NOT NULL after setting initial values
ALTER TABLE tasks ALTER COLUMN "order" SET NOT NULL;
