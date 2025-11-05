import { PiggyBank } from "lucide-react";

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2">
      <PiggyBank className="stroke h-11 w-11 stroke-purple-500 stroke-[1.5]" />
    </a>
  );
}

export function LogoMobile() {
  return (
    <a href="/" className="flex items-center gap-2">
      <PiggyBank className="stroke h-11 w-11 stroke-purple-500 stroke-[1.5]" />
    </a>
  );
}

export default Logo;
