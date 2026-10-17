-- Migration 008: Add ticket_price text column to buyers table
-- Allows storing per-buyer customized ticket price (e.g. 'LKR 3,500', 'LKR 5,000 (VIP)', 'USD 50', 'Complimentary')
-- Existing buyers will have ticket_price as NULL until Super Admin edits them.

ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS ticket_price text;

COMMENT ON COLUMN buyers.ticket_price IS 'Per-buyer ticket fee/price with currency or descriptive text (e.g. LKR 3,500, Complimentary). Null for unassigned.';
