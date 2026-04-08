-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Properties: public read, service_role write
CREATE POLICY "Properties are viewable by everyone"
  ON properties FOR SELECT USING (true);

-- Users: own profile only
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Saved searches: own user only
CREATE POLICY "Users can manage own searches"
  ON saved_searches FOR ALL USING (auth.uid() = user_id);

-- Favorites: own user only
CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL USING (auth.uid() = user_id);
