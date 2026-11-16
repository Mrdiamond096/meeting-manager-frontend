/** Temporary EGG Digital logo on Yolk (Figma decision D-Q4). Plain <img>: next/image adds an inline style that the nonce CSP blocks. */
export function BrandLogo() {
  return (
    <span className="inline-flex h-9 w-fit items-center rounded-md bg-brand px-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/egg-digital.png" alt="EGG Digital" width={45} height={24} className="h-6 w-auto" />
    </span>
  );
}
