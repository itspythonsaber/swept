const { Keypair, Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');

const betaPrivateKey = Uint8Array.from([69,234,190,156,204,193,64,35,46,173,1,216,228,114,66,178,109,26,59,216,21,67,45,157,81,197,75,227,78,138,166,200,27,125,64,212,38,106,241,177,34,203,240,136,219,86,16,9,149,208,68,202,184,23,224,39,149,55,253,76,52,6,246,35]);
const betaKeypair = Keypair.fromSecretKey(betaPrivateKey);
const connection = new Connection("https://api.mainnet-beta.solana.com");

let activeBets = [];
let crashPoint = 1 + Math.random() * 3;
let currentMultiplier = 1.0;

exports.handler = async (event) => {
  if(event.httpMethod === "GET") {
    currentMultiplier *= 1.02;
    if(currentMultiplier >= crashPoint) {
      currentMultiplier = 1.0;
      crashPoint = 1 + Math.random() * 3;
    }
    const topBets = activeBets.sort((a,b)=>b.payout-b.payout).slice(0,5);
    return { statusCode: 200, body: JSON.stringify({ multiplier: currentMultiplier.toFixed(2), leaderboard: topBets }) };
  }

  if(event.httpMethod === "POST") {
    try {
      const { betAmount, userPublicKey } = JSON.parse(event.body);
      const multiplier = 0.5 + Math.random() * 3;
      const payout = parseFloat((betAmount * multiplier).toFixed(4));

      activeBets.push({ user: userPublicKey, payout });
      if(activeBets.length > 50) activeBets.shift();

      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: betaKeypair.publicKey,
            toPubkey: new PublicKey(userPublicKey),
            lamports: Math.floor(payout * LAMPORTS_PER_SOL)
          })
        );
        const signature = await connection.sendTransaction(tx, [betaKeypair]);
        await connection.confirmTransaction(signature, "confirmed");
      } catch(err) {}

      return { statusCode: 200, body: JSON.stringify({ success: true, payout }) };
    } catch(err) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
    }
  }

  return { statusCode: 405, body: "Method not allowed" };
};
