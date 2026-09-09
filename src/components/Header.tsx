import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-[0.2em] text-neutral-950"
        >
          REWATCH
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          <Link
            href="/"
            className="text-sm text-neutral-700 hover:text-red-600"
          >
            Trang chủ
          </Link>

          <Link
            href="/gia-thu-mua"
            className="text-sm text-neutral-700 hover:text-red-600"
          >
            Tra cứu giá
          </Link>

          <Link
            href="/kien-thuc"
            className="text-sm text-neutral-700 hover:text-red-600"
          >
            Kiến thức
          </Link>

          <Link
            href="/lien-he"
            className="text-sm text-neutral-700 hover:text-red-600"
          >
            Liên hệ
          </Link>
        </nav>
      </div>
    </header>
  );
}