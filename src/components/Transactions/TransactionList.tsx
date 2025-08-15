import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../contexts/AppContext";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

export default function TransactionList() {
  const { selectedFirm } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedFirm) fetchTransactions();
  }, [selectedFirm]);

  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault();
      navigate("/dashboard");
    };

    window.addEventListener("popstate", handleBackButton);
    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*, user_profiles!fk_created_by(full_name), parties(name)")
      .eq("firm_id", selectedFirm?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const today = new Date();
  const defaultStart = new Date("2023-01-01");

  const filteredTransactions = transactions.filter((t) => {
    const createdAt = new Date(t.transaction_date);
    const start = startDate ? new Date(startDate) : endDate ? defaultStart : null;
    const end = endDate ? new Date(endDate) : startDate ? today : null;

    const matchesDate = (!start || createdAt >= start) && (!end || createdAt <= end);
    const matchesType = filterType === "all" || t.type === filterType;

    return matchesDate && matchesType;
  });

  const handleDownloadCSV = () => {
    const headers = ["Date", "Type", "Party", "Amount", "Status", "Created By"];
    const rows = filteredTransactions.map((t) => [
      format(new Date(t.transaction_date), "dd-MM-yyyy"),
      t.type,
      t.parties?.name || "Unknown",
      t.amount,
      t.status,
      t.user_profiles?.full_name || "Unknown",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, "transactions.csv");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Transactions Report", 14, 14);

    const tableData = filteredTransactions.map((t) => [
      format(new Date(t.transaction_date), "dd-MM-yyyy"),
      t.type,
      t.parties?.name || "Unknown",
      t.amount,
      t.status,
      t.user_profiles?.full_name || "Unknown",
    ]);

    autoTable({
      head: [["Date", "Type", "Party", "Amount", "Status", "Created By"]],
      body: tableData,
      startY: 20,
      styles: { fillColor: [255, 255, 255], textColor: 0 },
      headStyles: { fillColor: [0, 0, 0], textColor: 255 },
    });

    doc.save("transactions.pdf");
  };

  const handleClearFilters = () => {
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold">All Transactions</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="sale">Sales</option>
            <option value="collection">Collections</option>
            <option value="payment">Payments</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <button
            onClick={handleClearFilters}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded"
          >
            Clear Filters
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Export CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-1 bg-gray-800 text-white rounded"
          >
            Download PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          No transactions found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">
                    {format(new Date(t.transaction_date), "dd-MM-yyyy")}
                  </td>
                  <td className="px-4 py-2 capitalize">{t.type}</td>
                  <td className="px-4 py-2">{t.parties?.name || "Unknown"}</td>
                  <td className="px-4 py-2">₹{t.amount}</td>
                  <td className="px-4 py-2 capitalize">{t.status}</td>
                  <td className="px-4 py-2">
                    {t.user_profiles?.full_name || "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
