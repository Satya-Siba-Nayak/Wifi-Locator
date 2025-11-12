-- SQL Function to get hotspots with extracted coordinates
-- This function extracts lat/lng from PostGIS geography EWKB format
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_all_hotspots_with_coords()
RETURNS TABLE (
  id bigint,
  name text,
  address_text text,
  created_by uuid,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  username text,
  profile_id uuid,
  photo_id bigint,
  storage_path text,
  display_order int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    h.id,
    h.name,
    h.address_text,
    h.created_by,
    h.created_at,
    ST_Y(h.location::geometry) as latitude,
    ST_X(h.location::geometry) as longitude,
    p.username,
    p.id as profile_id,
    hp.id as photo_id,
    hp.storage_path,
    hp.display_order
  FROM hotspots h
  LEFT JOIN profiles p ON p.id = h.created_by
  LEFT JOIN hotspot_photos hp ON hp.hotspot_id = h.id
  ORDER BY h.created_at DESC;
$$;
