"use client";
import Logo, { LogoMobile } from "@/components/Logo";
import { ThemeSwitcherBtn } from "@/components/ThemeSwitcherBtn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function Navbar() {
  return (
    <>
      <DesktopNavbar />
      <MobileNavbar />
    </>
  );
}

const items = [
  { label: "Dashboard", link: "/" },
  { label: "Transactions", link: "/transactions" },
  { label: "Manage", link: "/manage" },
];

function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="block border-b border-border/50 bg-background/95 shadow-sm backdrop-blur md:hidden">
      <nav className="container flex h-14 items-center justify-between gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className="rounded-full">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-[400px]" side="left">
            <Logo />
            <div className="flex flex-col gap-1 pt-4">
              {items.map((item) => (
                <NavbarItem
                  key={item.label}
                  link={item.link}
                  label={item.label}
                  clickCallback={() => setIsOpen((prev) => !prev)}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex h-full min-h-[56px] items-center">
          <LogoMobile />
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcherBtn />
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>
    </div>
  );
}

function DesktopNavbar() {
  return (
    <div className="hidden border-b border-border/50 bg-background/95 shadow-sm backdrop-blur md:block">
      <nav className="container flex h-16 items-center justify-between px-6">
        <div className="flex h-full items-center gap-x-5">
          <Logo />
          <div className="flex h-full items-center gap-x-1">
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                link={item.link}
                label={item.label}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcherBtn />
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>
    </div>
  );
}

function NavbarItem({
  link,
  label,
  clickCallback,
}: {
  link: string;
  label: string;
  clickCallback?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === link;

  return (
    <div className="relative flex items-center">
      <Link
        href={link}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-auto w-full justify-start rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all md:w-auto md:justify-center",
          isActive
            ? "bg-accent/40 text-foreground shadow-sm hover:bg-accent/50"
            : "hover:bg-muted/60 hover:text-foreground"
        )}
        onClick={() => {
          if (clickCallback) clickCallback();
        }}
      >
        {label}
      </Link>
      {isActive && (
        <div className="absolute -bottom-2 left-1/2 hidden h-[3px] w-10 -translate-x-1/2 rounded-full bg-primary transition-all duration-200 md:block" />
      )}
    </div>
  );
}

export default Navbar;
