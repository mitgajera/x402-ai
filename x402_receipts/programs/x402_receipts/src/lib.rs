use anchor_lang::prelude::*;

declare_id!("12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1");

#[program]
pub mod x402_receipts {
    use super::*;

    pub fn record_receipt(
        ctx: Context<RecordReceipt>,
        reference: String,
        model_id: String,
        amount: u64,
        tx_sig: String,
    ) -> Result<()> {
        let receipt = &mut ctx.accounts.receipt;

        require!(
            reference.len() <= 64,
            X402Error::ReferenceTooLong
        );
        require!(
            model_id.len() <= 32,
            X402Error::ModelIdTooLong
        );
        require!(
            tx_sig.len() <= 128,
            X402Error::TxSigTooLong
        );

        receipt.payer = ctx.accounts.payer.key();
        receipt.merchant = ctx.accounts.merchant.key();
        receipt.reference = reference;
        receipt.model_id = model_id;
        receipt.amount = amount;
        // Allow empty tx_sig for same-transaction calls (will be updated after confirmation)
        receipt.tx_sig = tx_sig;
        receipt.timestamp = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(reference: String)]
pub struct RecordReceipt<'info> {
    #[account(
        init,
        payer = payer,
        space = Receipt::LEN,
        seeds = [b"receipt", reference.as_bytes()],
        bump,
    )]
    pub receipt: Account<'info, Receipt>,

    /// CHECK: merchant stored, not written to
    pub merchant: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Receipt {
    pub payer: Pubkey,
    pub merchant: Pubkey,
    pub reference: String,
    pub model_id: String,
    pub amount: u64,
    pub tx_sig: String,
    pub timestamp: i64,
}

impl Receipt {
    // rough size calculation:
    // 8 (discriminator) +
    // 32 + 32 + (4 + 64) + (4 + 32) + 8 + (4 + 128) + 8 = 8 + 32 + 32 + 68 + 36 + 8 + 132 + 8 = 324
    pub const LEN: usize = 8 + 32 + 32 + 68 + 36 + 8 + 132 + 8;
}

#[error_code]
pub enum X402Error {
    #[msg("Reference string too long")]
    ReferenceTooLong,
    #[msg("Model ID too long")]
    ModelIdTooLong,
    #[msg("Transaction signature too long")]
    TxSigTooLong,
}
