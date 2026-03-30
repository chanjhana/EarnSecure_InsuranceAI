// TODO: Implement rider registration endpoints.
// POST /riders/link-platform
// PUT /riders/{rider_id}/profile

export type Platform = 'swiggy' | 'zomato';

export async function linkPlatform(_payload: { platform: Platform; rider_id: string }): Promise<{ valid: boolean; activity_summary: { d30_orders: number; avg_daily: number; zones: string[] } }> {
  // TODO: Validate rider id against mock partner API.
  return { valid: false, activity_summary: { d30_orders: 0, avg_daily: 0, zones: [] } };
}

export async function updateRiderProfile(_payload: { rider_id: string; pin_code: string; shift_window: 'morning' | 'afternoon' | 'evening' | 'night'; upi_id?: string }): Promise<void> {
  // TODO: Persist rider zone/shift/UPI details.
}
