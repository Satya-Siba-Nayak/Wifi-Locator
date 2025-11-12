-- Migration: Add photos support for hotspots
-- Run this in your Supabase SQL Editor

-- 1. Create photos table
CREATE TABLE IF NOT EXISTS public.hotspot_photos (
  id BIGSERIAL PRIMARY KEY,
  hotspot_id BIGINT NOT NULL REFERENCES public.hotspots(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  display_order INT DEFAULT 0, -- Order to display photos (0 = first)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_storage_path UNIQUE(storage_path)
);

-- 2. Create index for fast queries
CREATE INDEX hotspot_photos_hotspot_id_idx ON public.hotspot_photos(hotspot_id);
CREATE INDEX hotspot_photos_uploaded_by_idx ON public.hotspot_photos(uploaded_by);

-- 3. Enable Row Level Security
ALTER TABLE public.hotspot_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos
CREATE POLICY "Allow public read access to photos" ON public.hotspot_photos
  FOR SELECT USING (true);

-- Only authenticated users can upload photos
CREATE POLICY "Allow authenticated users to upload photos" ON public.hotspot_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = uploaded_by);

-- Users can delete their own photos
CREATE POLICY "Allow users to delete their own photos" ON public.hotspot_photos
  FOR DELETE USING (auth.uid() = uploaded_by);

-- 4. Create storage bucket for photos (run in Supabase Dashboard -> Storage)
-- Bucket name: hotspot-photos
-- Public: true (so photos can be displayed without auth)
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 10MB

COMMENT ON TABLE public.hotspot_photos IS 'Stores references to hotspot photos in Supabase Storage';
COMMENT ON COLUMN public.hotspot_photos.storage_path IS 'Path in Supabase Storage bucket (hotspot-photos/)';
COMMENT ON COLUMN public.hotspot_photos.display_order IS 'Order to display photos, lower numbers first';
