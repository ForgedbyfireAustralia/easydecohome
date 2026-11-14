// Environment access. On Netlify this reads Netlify.env; in local tests it falls back to process.env.
// Never log the values returned from here.
declare const Netlify: { env: { get(name: string): string | undefined } } | undefined;

export function env(name: string): string | undefined {
  const fromNetlify = typeof Netlify !== "undefined" ? Netlify?.env?.get(name) : undefined;
  return fromNetlify ?? process.env[name];
}

/** "prod" only when explicitly set. Anything else is treated as the sandbox. */
export function airwallexEnv(): "prod" | "demo" {
  return env("AIRWALLEX_ENV") === "prod" ? "prod" : "demo";
}

/** Example prices and freight may be used in the sandbox only, never in production. */
export function allowExamples(): boolean {
  return airwallexEnv() !== "prod";
}

export const BRAND = "Easy Deco Home";
export const DOMAIN = "easydecohome.com.au";
/** The Hong Kong company that sells and invoices. Must match the Airwallex account entity. */
export const SELLER = "[HK COMPANY NAME]";
