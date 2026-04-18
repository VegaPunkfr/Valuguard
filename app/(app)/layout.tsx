import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse at top, #0a0f1a 0%, #060912 55%, #04060c 100%)",
        color: "#e4e9f4",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
