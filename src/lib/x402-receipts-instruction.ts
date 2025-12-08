import { PublicKey, SystemProgram } from '@solana/web3.js'
import { Address, IInstruction, AccountRole } from 'gill'
import { X402_RECEIPTS_PROGRAM_ID } from './x402-receipts-idl'
import { Buffer } from 'buffer'

// Make Buffer available globally for browser compatibility
if (typeof window !== 'undefined' && !window.Buffer) {
  ;(window as { Buffer?: typeof Buffer }).Buffer = Buffer
}

/**
 * Build instruction to call the x402_receipts Anchor program's record_receipt instruction
 * Uses manual Borsh encoding matching Anchor's format (browser-compatible)
 */
export function getRecordReceiptInstruction({
  payer,
  merchant,
  reference,
  modelId,
  amount,
  txSig = '', // Empty string for same-transaction calls
}: {
  payer: Address
  merchant: Address
  reference: string
  modelId: string
  amount: bigint
  txSig?: string
}): IInstruction {
  const programId = new PublicKey(X402_RECEIPTS_PROGRAM_ID)

  // Derive PDA for receipt account
  const [receiptPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('receipt'),
      Buffer.from(reference),
    ],
    programId
  )

  // Instruction discriminator for record_receipt: [123, 1, 227, 189, 86, 215, 19, 253]
  const discriminator = Buffer.from([123, 1, 227, 189, 86, 215, 19, 253])

  // Encode arguments using Borsh (Anchor's encoding format)
  // String encoding: 4 bytes (u32 length) + string bytes
  // u64 encoding: 8 bytes little-endian
  const referenceBuf = Buffer.from(reference, 'utf8')
  const modelIdBuf = Buffer.from(modelId, 'utf8')
  const txSigBuf = Buffer.from(txSig, 'utf8')
  
  // Create buffers for length prefixes (u32 little-endian)
  const referenceLen = Buffer.allocUnsafe(4)
  referenceLen.writeUInt32LE(referenceBuf.length, 0)
  
  const modelIdLen = Buffer.allocUnsafe(4)
  modelIdLen.writeUInt32LE(modelIdBuf.length, 0)
  
  const txSigLen = Buffer.allocUnsafe(4)
  txSigLen.writeUInt32LE(txSigBuf.length, 0)
  
  // u64 encoding (8 bytes little-endian)
  const amountBuf = Buffer.allocUnsafe(8)
  // Write bigint as little-endian
  let val = amount
  for (let i = 0; i < 8; i++) {
    amountBuf[i] = Number(val & 0xffn)
    val = val >> 8n
  }

  // Combine all data: discriminator + args
  const instructionData = Buffer.concat([
    discriminator,
    referenceLen,
    referenceBuf,
    modelIdLen,
    modelIdBuf,
    amountBuf,
    txSigLen,
    txSigBuf,
  ])

  return {
    programAddress: programId.toString() as Address,
    accounts: [
      { address: receiptPda.toString() as Address, role: AccountRole.WRITABLE },
      { address: merchant, role: AccountRole.READONLY },
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: SystemProgram.programId.toString() as Address, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(instructionData),
  }
}

