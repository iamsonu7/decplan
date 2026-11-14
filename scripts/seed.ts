// Run with:  npm run db:seed
async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // use variables already in the environment
  }
  const { seedDecemberPlan } = await import("@/lib/seed");
  console.log(`December plan: ${await seedDecemberPlan()}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
