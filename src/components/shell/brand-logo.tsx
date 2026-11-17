/** A plain image avoids the inline styles added by next/image, which the nonce CSP blocks. */
export function BrandLogo() {
  return (
    <span className="inline-flex h-9 w-fit items-center rounded-md bg-brand px-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/egg-digital.png" alt="EGG Digital" width={45} height={24} className="h-6 w-auto" />
    </span>
  );
}
