import Header from "@/components/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] text-neutral-950">
      <Header />

      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center px-6 py-20">
        <div className="max-w-4xl">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.25em] text-red-600">
            Dịch vụ thu mua đồng hồ
          </p>

          <h1 className="text-5xl font-normal leading-[1.1] tracking-tight md:text-7xl">
            Giá trị thực cho
            <br />
            chiếc đồng hồ của bạn
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-600">
            Nhận định giá Rolex, Omega, Cartier và nhiều thương hiệu cao cấp
            khác. Quy trình rõ ràng, giao dịch nhanh chóng và bảo mật.
          </p>

          <button className="mt-10 bg-neutral-950 px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-red-600">
            Yêu cầu báo giá
          </button>
        </div>
      </section>
    </main>
  );
}