import { Suspense } from "react";
import EditListingForm from "./EditListingForm";

export default function EditListingPage() {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="mx-auto max-w-3xl p-8">
          در حال آماده‌سازی فرم ویرایش...
        </main>
      }
    >
      <EditListingForm />
    </Suspense>
  );
}