"use client";

export default function PrintListingButton() {
  return (
    <button
      type="button"
      className="hd-print-button"
      onClick={() => window.print()}
      aria-label="چاپ مشخصات ملک"
    >
      <span aria-hidden="true">⎙</span>
      <span>چاپ مشخصات</span>
    </button>
  );
}
