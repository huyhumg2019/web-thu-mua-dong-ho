import Header from "@/components/Header";

export default function GiaThuMuaPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] text-neutral-950">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-red-600">
              Định giá đồng hồ
            </p>

            <h1 className="text-4xl font-normal leading-tight tracking-tight md:text-6xl">
              Tra cứu giá thu mua
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
              Nhập mã Reference của đồng hồ để xem mức giá thu mua dự kiến.
              Giá chính xác sẽ được xác nhận sau khi kiểm tra tình trạng thực tế.
            </p>
          </div>

          <form className="border border-neutral-300 bg-white p-8">
            <label
              htmlFor="reference"
              className="block text-sm font-medium text-neutral-800"
            >
              Mã Reference
            </label>

            <input
              id="reference"
              name="reference"
              type="text"
              placeholder="Ví dụ: 126710BLRO"
              className="mt-3 w-full border border-neutral-300 bg-white px-4 py-4 text-lg outline-none transition focus:border-neutral-950"
            />

            <button
              type="submit"
              className="mt-5 w-full bg-neutral-950 px-6 py-4 font-medium text-white transition-colors hover:bg-red-600"
            >
              Tra cứu giá
            </button>

            <p className="mt-5 text-sm leading-6 text-neutral-500">
              Giá hiển thị chỉ mang tính tham khảo và có thể thay đổi theo thị
              trường, phụ kiện đi kèm và tình trạng đồng hồ.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}