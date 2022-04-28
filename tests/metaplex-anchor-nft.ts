import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MetaplexAnchorNft } from "../target/types/metaplex_anchor_nft";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token"; // IGNORE THESE ERRORS IF ANY
// import { PublicKey } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
// import { LAMPORTS_PER_SOL } from "@solana/web3.js";
const { SystemProgram } = anchor.web3;
describe("metaplex-anchor-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace
    .MetaplexAnchorNft as Program<MetaplexAnchorNft>;

  it("Is initialized!", async () => {
    // Add your test here.
    let voucher_key: PublicKey;
    let voucher_metadata: PublicKey;
    let voucher_master_edition: PublicKey;
    let voucher_token_account: PublicKey;
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );
    const lamports: number =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );
    const getMetadata = async (
      mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
      return (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];
    };

    const getMasterEdition = async (
      mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
      return (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
            Buffer.from("edition"),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];
    };

    async function mintGift() {
      const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
      const NftTokenAccount = await getAssociatedTokenAddress(
        mintKey.publicKey,
        program.provider.wallet.publicKey
      );
      console.log("NFT Account: ", NftTokenAccount.toBase58());
      voucher_key = mintKey.publicKey;
      voucher_token_account = NftTokenAccount;
      const mint_tx = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: program.provider.wallet.publicKey,
          newAccountPubkey: mintKey.publicKey,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
          lamports: lamports,
        }),
        createInitializeMintInstruction(
          mintKey.publicKey,
          0,
          program.provider.wallet.publicKey,
          program.provider.wallet.publicKey
        ),
        createAssociatedTokenAccountInstruction(
          program.provider.wallet.publicKey,
          NftTokenAccount,
          program.provider.wallet.publicKey,
          mintKey.publicKey
        )
      );
      const res = await program.provider.send(mint_tx, [mintKey]);
      console.log(
        await program.provider.connection.getParsedAccountInfo(
          mintKey.publicKey
        )
      );

      console.log("Account: ", res);
      console.log("Mint key: ", mintKey.publicKey.toString());
      console.log("User: ", program.provider.wallet.publicKey.toString());

      const metadataAddress = await getMetadata(mintKey.publicKey);
      const masterEdition = await getMasterEdition(mintKey.publicKey);
      voucher_master_edition = masterEdition;
      voucher_metadata = metadataAddress;
      console.log("Metadata address: ", metadataAddress.toBase58());
      console.log("MasterEdition: ", masterEdition.toBase58());

      try {
        const tx = await program.rpc.mintGift(
          mintKey.publicKey,
          "https://arweave.net/y5e5DJsiwH0s_ayfMwYk-SnrZtVZzHLQDSTZ5dNRUHA",
          "Gift",
          {
            accounts: {
              mintAuthority: program.provider.wallet.publicKey,
              mint: mintKey.publicKey,
              tokenAccount: NftTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              metadata: metadataAddress,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
              payer: program.provider.wallet.publicKey,
              systemProgram: SystemProgram.programId,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
              masterEdition: masterEdition,
            },
            // signers: [mintKey],
          }
        );
        console.log("Your transaction signature", tx);
      } catch (e) {
        console.log("Error: ", e);
      }
    }
    mintGift();
    try {
      const tx = await program.rpc.redeemGift({
        accounts: {
          mintAuthority: program.provider.wallet.publicKey,
          mint: voucher_key,
          tokenAccount: voucher_token_account,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadata: voucher_metadata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          payer: program.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          masterEdition: voucher_master_edition,
        },
      });
      console.log("Your transaction signature", tx);
    } catch (error) {
      console.log("Error: ", error);
    }

    // loop 3 times and print value of i
    for (let i = 0; i < 3; i++) {
      mintGift();
    }
  });
});
