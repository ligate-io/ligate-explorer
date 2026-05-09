'use server'

import { getDripStatus, requestDrip } from '@/lib/api'

export type DripActionResult =
  | { kind: 'success'; tx_hash: string; address: string }
  | { kind: 'cooldown'; next_drip_at: string | null }
  | { kind: 'invalid'; message: string }

const ADDR_REGEX = /^lig1[a-z0-9]{38,}$/

export async function dripAction(formData: FormData): Promise<DripActionResult> {
  const raw = (formData.get('address') ?? '').toString().trim()
  if (!ADDR_REGEX.test(raw)) {
    return {
      kind: 'invalid',
      message: 'Invalid address. Must match lig1[a-z0-9]{38+}',
    }
  }

  const status = await getDripStatus(raw)
  if (!status.can_drip) {
    return { kind: 'cooldown', next_drip_at: status.next_drip_at }
  }

  const result = await requestDrip(raw)
  return { kind: 'success', tx_hash: result.tx_hash, address: raw }
}
