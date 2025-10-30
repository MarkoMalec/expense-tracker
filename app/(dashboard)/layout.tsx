import Navbar from "@/components/Navbar";
import AIChat from "@/lib/ai/components/AIChat";
import { ReactNode } from "react";

function layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex w-full flex-col">
        <Navbar />
        <div className="w-full">{children}</div>
        <AIChat />
      </div>
    </>
  );
}

export default layout;
