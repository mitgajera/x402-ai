import type { X402Receipts } from './x402-receipts-types'
import rawIdl from './x402-receipts-idl.json'


export const X402_RECEIPTS_IDL = rawIdl as X402Receipts

export type X402ReceiptsIdl = X402Receipts

export const X402_RECEIPTS_PROGRAM_ID = X402_RECEIPTS_IDL.address


