import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Need service role for bypass RLS if needed, or use anon if policies allow

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSports() {
  console.log("Seeding sports venues...");
  
  // Get a college ID to link to
  const { data: colleges } = await supabase.from('colleges').select('id').limit(1);
  const collegeId = colleges?.[0]?.id;

  const venues = [
    {
      name: "Main Badminton Arena",
      sport: "badminton",
      emoji: "🏸",
      location_text: "Indoor Sports Complex, East Wing",
      college_id: collegeId,
      booking_type: "slotted",
      is_approved: true,
      price_per_hour: "Free for students"
    },
    {
      name: "Olympic Football Turf",
      sport: "football",
      emoji: "⚽",
      location_text: "South Campus Athletics Ground",
      college_id: collegeId,
      booking_type: "open",
      is_approved: true,
      price_per_hour: "Free"
    },
    {
      name: "Pro-League Cricket Nets",
      sport: "cricket",
      emoji: "🏏",
      location_text: "NXT Sports Hub, Sector 62",
      college_id: null,
      booking_type: "slotted",
      is_approved: true,
      price_per_hour: "₹500/hr",
      maps_url: "https://maps.google.com"
    }
  ];

  const { data: insertedVenues, error: vErr } = await supabase.from('sports_venues').upsert(venues, { onConflict: 'name' }).select();
  
  if (vErr) {
    console.error("Error seeding venues:", vErr);
    return;
  }

  console.log(`Seeded ${insertedVenues.length} venues.`);

  const slots = [
    "06:00 AM", "07:00 AM", "08:00 AM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"
  ];

  for (const venue of insertedVenues) {
    if (venue.booking_type === 'slotted') {
      console.log(`Creating slots for ${venue.name}...`);
      const slotData = slots.map(time => ({
        venue_id: venue.id,
        slot_time: time,
        max_bookings: venue.sport === 'badminton' ? 4 : 1,
        is_active: true
      }));
      await supabase.from('sports_slots').insert(slotData);
    }
  }

  console.log("Seeding complete!");
}

seedSports();
