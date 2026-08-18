#!/usr/bin/env node
// Lists every product + variant for a Lemon Squeezy store, so you can copy
// the 6 variant ids (Solo/Team/Scale x Monthly/Yearly) into .env.
//
// Read-only GET requests against Lemon Squeezy's API -- makes no writes,
// touches no money. Safe to run with the test-mode API key. This is a
// standalone dev script, not part of the Next.js app -- it is never
// imported or bundled, just run manually from the terminal.
//
// Usage (store id from env):
//   LEMON_SQUEEZY_API_KEY=... LEMON_SQUEEZY_STORE_ID=454819 node scripts/lemon-squeezy-list-variants.mjs
// Usage (store id as an argument):
//   LEMON_SQUEEZY_API_KEY=... node scripts/lemon-squeezy-list-variants.mjs 454819
//
// Do not hardcode the API key into this file or pass it as a bare CLI
// arg (shell history) -- set it as an env var for the one command.

const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
const storeId = process.argv[2] ?? process.env.LEMON_SQUEEZY_STORE_ID;

if (!apiKey) {
  console.error("Missing LEMON_SQUEEZY_API_KEY. Set it in your shell for this one command, do not hardcode it.");
  process.exit(1);
}
if (!storeId) {
  console.error("Missing store id. Pass it as an argument, or set LEMON_SQUEEZY_STORE_ID.");
  process.exit(1);
}

const BASE_URL = "https://api.lemonsqueezy.com/v1";
const headers = {
  Accept: "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json",
  Authorization: `Bearer ${apiKey}`,
};

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}\n${body}`);
  }
  return res.json();
}

function formatPrice(cents) {
  if (cents === null || cents === undefined) return "n/a";
  return `$${(cents / 100).toFixed(2)}`;
}

async function main() {
  const productsResult = await get(`/products?filter[store_id]=${storeId}`);
  const products = productsResult.data ?? [];

  if (products.length === 0) {
    console.log(
      `No products found for store ${storeId}. Double-check the store id, and that the API key's mode ` +
        `(test/live) matches where the products actually live.`
    );
    return;
  }

  console.log(`Store ${storeId} -- ${products.length} product(s)\n`);

  for (const product of products) {
    console.log(`Product: ${product.attributes.name}  (product_id=${product.id})`);

    const variantsResult = await get(`/variants?filter[product_id]=${product.id}`);
    const variants = variantsResult.data ?? [];

    if (variants.length === 0) {
      console.log("  (no variants)");
      continue;
    }

    for (const variant of variants) {
      const a = variant.attributes;
      const interval = a.is_subscription ? `${a.interval_count} ${a.interval}` : "one-time";
      console.log(
        `  - ${a.name}  variant_id=${variant.id}  price=${formatPrice(a.price)}  interval=${interval}  status=${a.status}`
      );
    }
    console.log("");
  }

  console.log("Copy each variant_id above into the matching LEMON_SQUEEZY_VARIANT_* env var.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
