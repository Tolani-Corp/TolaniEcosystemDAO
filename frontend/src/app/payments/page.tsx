"use client";

import { useState } from "react";
import MerchantDashboard from "@/components/payments/MerchantDashboard";
import PaymentScanner from "@/components/payments/PaymentScanner";
import { CreditCard, Store } from "lucide-react";

export default function PaymentsPage() {
  const [mode, setMode] = useState<"pay" | "merchant">("pay");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payments</h1>
          <p className="mt-1 text-gray-400">
            Scan customer payments or manage merchant checkout tooling.
          </p>
        </div>

        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-1 shadow-xl">
          <button
            onClick={() => setMode("pay")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              mode === "pay" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Pay
          </button>
          <button
            onClick={() => setMode("merchant")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              mode === "merchant" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Store className="h-4 w-4" />
            Merchant
          </button>
        </div>
      </div>

      {mode === "pay" ? <PaymentScanner /> : <MerchantDashboard />}
    </div>
  );
}
