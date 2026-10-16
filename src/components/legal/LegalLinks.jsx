import React from "react";
import { Link } from "react-router-dom";

/** The two links every store asks for, standing where they are met before anyone signs in. */
export default function LegalLinks({ className = "" }) {
  return (
    <p className={`text-center text-[12px] text-muted-foreground ${className}`}>
      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      <span aria-hidden="true" className="px-1.5">
        ·
      </span>
      <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
        Terms of Use
      </Link>
    </p>
  );
}