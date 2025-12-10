/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `x402-receipts-idl.json`.
 */
export type X402Receipts = {
  "address": "12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1",
  "metadata": {
    "name": "x402Receipts",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "recordReceipt",
      "discriminator": [
        123,
        1,
        227,
        189,
        86,
        215,
        19,
        253
      ],
      "accounts": [
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "reference"
              }
            ]
          }
        },
        {
          "name": "merchant"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "reference",
          "type": "string"
        },
        {
          "name": "modelId",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "txSig",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "receipt",
      "discriminator": [
        39,
        154,
        73,
        106,
        80,
        102,
        145,
        153
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "referenceTooLong",
      "msg": "Reference string too long"
    },
    {
      "code": 6001,
      "name": "modelIdTooLong",
      "msg": "Model ID too long"
    },
    {
      "code": 6002,
      "name": "txSigTooLong",
      "msg": "Transaction signature too long"
    }
  ],
  "types": [
    {
      "name": "receipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "reference",
            "type": "string"
          },
          {
            "name": "modelId",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "txSig",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};

