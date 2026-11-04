"use client";

export default function PrintListingButton() {
  return (
    <button
      type="button"
      className="hd-print-button"
      onClick={() => window.print()}
      aria-label="چاپ یا ذخیره آگهی به‌صورت PDF"
    >
      <span aria-hidden="true">⎙</span>
      <span>چاپ / ذخیره PDF</span>
    </button>
  );
}
