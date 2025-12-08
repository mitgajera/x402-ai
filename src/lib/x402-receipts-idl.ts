import type { X402Receipts } from '../../x402_receipts/target/types/x402_receipts'
import rawIdl from '../../x402_receipts/target/idl/x402_receipts.json'


export const X402_RECEIPTS_IDL = rawIdl as X402Receipts

export type X402ReceiptsIdl = X402Receipts

export const X402_RECEIPTS_PROGRAM_ID = X402_RECEIPTS_IDL.address


