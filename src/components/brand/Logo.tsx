import Image from "next/image";

export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return <Image src="/brand/logo.png" alt="Lama Logística y Distribución S.R.L." width={738} height={258} className={className} priority />;
}

export function Isotipo({ className = "h-7 w-7" }: { className?: string }) {
  return <Image src="/brand/isotipo.png" alt="" width={512} height={512} className={className} />;
}
