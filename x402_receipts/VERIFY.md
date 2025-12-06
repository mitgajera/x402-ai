# Program Verification Guide

## Why "Unverified Build" appears

The "Unverified Build" status means the program's source code hasn't been verified on-chain. This doesn't affect functionality but is important for trust and security.

## How to Verify Your Program

1. **Build the program:**
   ```bash
   anchor build
   ```

2. **Deploy the program:**
   ```bash
   anchor deploy
   ```

3. **Verify the program:**
   
   You need to provide either `--repo-url` (if your code is on GitHub) or `--current-dir` (to verify from local directory).
   
   **Option 1: Verify from current directory (local):**
   ```bash
   anchor verify 12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1 --provider.cluster devnet --current-dir
   ```
   
   **Option 2: Verify from GitHub repository:**
   ```bash
   anchor verify 12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1 --provider.cluster devnet --repo-url https://github.com/mitgajera/x402-ai
   ```
   
   **Troubleshooting "Text file busy" error on WSL:**
   
   If you encounter "Text file busy (os error 26)" on WSL/Windows:
   
   1. **Close any processes using Anchor:**
      - Close all terminal windows
      - Stop any running Anchor processes
      - Wait a few seconds and try again
   
   2. **Use GitHub verification instead:**
      - Push your code to GitHub
      - Use `--repo-url` option (this avoids local file locking issues)
   
   3. **Skip verification (program works fine without it):**
      - Verification is optional and doesn't affect functionality
      - Your program is already deployed and working
      - Verification is mainly for trust/transparency in block explorers
   
   Note: If using `--repo-url`, make sure your code is pushed to GitHub and the repository is public.

## Security.txt

The `security.txt` file has been created in the `x402_receipts` directory. To make it available on-chain:

1. Update the contact information in `security.txt`
2. Deploy it to your program's metadata account
3. Or host it at a public URL and reference it in your program metadata

## Note

Verification is optional for functionality but recommended for production deployments. Your program works fine without verification - it just won't show as "verified" in block explorers.

