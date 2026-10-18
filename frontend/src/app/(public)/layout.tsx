import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNav } from "@/components/public/PublicNav";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}
