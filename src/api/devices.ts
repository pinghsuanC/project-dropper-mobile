// Devices routes (the server repo's API.md).
import { request } from '@/api/client';
import type { PairedDevice, PairedDeviceData } from '@/api/types';
import { API_PATHS } from '@/constants/config';

/**
 * `GET /devices/paired` (protected): the one device this phone is paired with, or null when
 * it isn't paired (still a 200). Its `device_id` is the upload `receiver_id`.
 */
export async function getPairedDevice(): Promise<PairedDevice | null> {
  const data = await request<PairedDeviceData>(API_PATHS.pairedDevice, { auth: true });
  return data.device;
}
