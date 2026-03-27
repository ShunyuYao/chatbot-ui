-- Create shared_chats table
CREATE TABLE IF NOT EXISTS shared_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  share_token text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create unique index on share_token (already unique constraint, but explicit index for performance)
CREATE UNIQUE INDEX IF NOT EXISTS shared_chats_share_token_idx ON shared_chats (share_token);

-- Enable Row Level Security
ALTER TABLE shared_chats ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read shared chats (public access via share_token)
CREATE POLICY "Anyone can view shared chats" ON shared_chats
  FOR SELECT
  USING (true);

-- Policy: Only the owner can insert their own share records
CREATE POLICY "Users can create their own share records" ON shared_chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only the owner can delete their own share records
CREATE POLICY "Users can delete their own share records" ON shared_chats
  FOR DELETE
  USING (auth.uid() = user_id);
