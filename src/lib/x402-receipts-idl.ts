import type { X402Receipts } from '../../x402_receipts/target/types/x402_receipts'
import rawIdl from '../../x402_receipts/target/idl/x402_receipts.json'

/**
 * Typed Codama/Anchor IDL + program metadata for the `x402_receipts` program.
 *
 * NOTE: This is frontend-only metadata. All state changes (writing receipts)
 * should still be performed on the backend after verifying payments.
 */
export const X402_RECEIPTS_IDL = rawIdl as X402Receipts

export type X402ReceiptsIdl = X402Receipts

export const X402_RECEIPTS_PROGRAM_ID = X402_RECEIPTS_IDL.address


