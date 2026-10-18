import { Mark } from "@/components/public/PublicNav";

export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <header className="flex h-[72px] items-center px-4 md:px-10" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <Mark />
      </header>
      <main className="mx-auto grid max-w-[520px] place-items-center px-4 py-16">{children}</main>
    </div>
  );
}
